import { splitFrontMatter } from '@/features/doc/frontmatter'
import { fromTemplate } from '@/features/templates/templates'
import type { Mode } from './create'
import type { Content, FunctionDeclaration } from './gemini'

export const WEEK = 7 * 24 * 60 * 60 * 1000

export type ChangeKind = 'edit' | 'create' | 'board'
export type Change = {
  id: string
  kind: ChangeKind
  /** The doc (edit, create) or the board (board). */
  path: string
  /** New content of the doc (edit, create). */
  markdown?: string
  /** What to draw (board). */
  boardKind?: Mode
  prompt?: string
  /** The doc's content before an applied edit, so Undo can write it back. */
  before?: string
  state: 'pending' | 'applied' | 'discarded' | 'undone'
}
export type Message = { role: 'user' | 'assistant'; text: string; changes?: Change[]; error?: string }
export type Chat = { id: string; vault: string; created: number; updated: number; title: string; messages: Message[]; extra: string[] }
export type ApplyMode = 'approve' | 'auto'

const STR = { type: 'STRING' }

/** The only things the model can do. It has no way to delete, rename or move a page. */
export const FUNCTIONS: FunctionDeclaration[] = [
  {
    name: 'edit_doc',
    description: 'Replace the whole content of a doc that is in the context. Give the complete new markdown, keeping any front matter.',
    parameters: { type: 'OBJECT', properties: { path: STR, markdown: STR }, required: ['path', 'markdown'] },
  },
  {
    name: 'create_doc',
    description: 'Create a new doc that does not exist yet. The path ends with .md.',
    parameters: { type: 'OBJECT', properties: { path: STR, markdown: STR }, required: ['path', 'markdown'] },
  },
  {
    name: 'add_to_board',
    description: 'Add generated content to the board that is open: sticky notes, a flow diagram or an outline.',
    parameters: { type: 'OBJECT', properties: { kind: { type: 'STRING', enum: ['sticky', 'flow', 'outline'] }, prompt: STR }, required: ['kind', 'prompt'] },
  },
]

/** System prompt: the rules and the pages in context (path and content). */
export function systemPrompt(pages: { path: string; text: string }[]) {
  const context = pages.map((p) => `=== ${p.path} ===\n${p.text}`).join('\n\n')
  return [
    'You are the assistant of a notes app. Answer briefly.',
    'Change notes only through the functions you are given: edit_doc, create_doc and add_to_board.',
    'edit_doc works only on pages listed in the context below. You cannot delete, rename or move pages: say so if asked.',
    `Context pages:\n\n${context || '(none)'}`,
  ].join('\n')
}

export type Ctx = {
  /** Paths of the pages in context: the open page and the ones added with @. */
  context: string[]
  /** The open board, if the open page is one. */
  board?: string
  exists: (path: string) => boolean
}
export type Call = { name: string; args: Record<string, unknown> }
export type Checked = { ok: true; change: Omit<Change, 'id' | 'state'> } | { ok: false; error: string }

const str = (v: unknown) => (typeof v === 'string' ? v : '')
// Same rule as page names (NameInput), per path segment.
const BAD_SEGMENT = /^\.|[\\/:*?"<>|]/

/** Decides whether a model call is allowed. Anything outside the three functions, or outside the context, is refused. */
export function checkCall(call: Call, ctx: Ctx): Checked {
  const path = str(call.args.path)
  if (call.name === 'edit_doc') {
    if (!ctx.context.includes(path) || !path.endsWith('.md')) return { ok: false, error: `${path || 'That page'} is not a doc in the context, so it cannot be edited. The user can add it with @.` }
    return { ok: true, change: { kind: 'edit', path, markdown: str(call.args.markdown) } }
  }
  if (call.name === 'create_doc') {
    const segments = path.split('/')
    if (!path.endsWith('.md') || segments.some((s) => !s || BAD_SEGMENT.test(s))) return { ok: false, error: `"${path}" is not a valid doc path.` }
    if (ctx.exists(path)) return { ok: false, error: `${path} already exists.` }
    return { ok: true, change: { kind: 'create', path, markdown: str(call.args.markdown) } }
  }
  if (call.name === 'add_to_board') {
    const kind = str(call.args.kind)
    if (!ctx.board) return { ok: false, error: 'No board is open.' }
    if (kind !== 'sticky' && kind !== 'flow' && kind !== 'outline') return { ok: false, error: `Unknown kind "${kind}".` }
    return { ok: true, change: { kind: 'board', path: ctx.board, boardKind: kind, prompt: str(call.args.prompt) } }
  }
  return { ok: false, error: `There is no function named ${call.name}. Pages cannot be deleted, renamed or moved.` }
}

/** The model's markdown with the doc's own front matter (icon, created, tags) kept when the model left it out. */
export function keepFront(before: string, markdown: string) {
  const { front } = splitFrontMatter(before)
  return splitFrontMatter(markdown).front ? markdown : front + markdown
}

/** The parts of a `Vault` that applying a change uses. */
export type Io = {
  read(path: string): Promise<string>
  write(path: string, data: string): Promise<void>
  createPage(dir: string, name: string, type: 'doc'): Promise<string>
  trash(paths: string[]): Promise<void>
}
export type Env = { io: Io; now: { created: string; date: string }; board?: (mode: Mode, prompt: string) => Promise<void> }

/** Applies a change; returns it as applied, with the old content for Undo. */
export async function applyChange(env: Env, change: Change): Promise<Change> {
  if (change.kind === 'edit') {
    const before = await env.io.read(change.path)
    await env.io.write(change.path, keepFront(before, change.markdown ?? ''))
    return { ...change, before, state: 'applied' }
  }
  if (change.kind === 'create') {
    const i = change.path.lastIndexOf('/')
    const created = await env.io.createPage(i < 0 ? '' : change.path.slice(0, i), change.path.slice(i + 1, -'.md'.length), 'doc')
    await env.io.write(created, fromTemplate(change.markdown ?? '', env.now.created, env.now.date))
    return { ...change, state: 'applied' }
  }
  if (!env.board) throw new Error('Open the board first.')
  await env.board(change.boardKind!, change.prompt ?? '')
  return { ...change, state: 'applied' }
}

/** Takes an applied change back: an edit gets its old content written, a created doc goes to the Trash. Board changes undo with the board's own Undo. */
export async function undoChange(env: Env, change: Change): Promise<Change> {
  if (change.state !== 'applied') return change
  if (change.kind === 'edit') await env.io.write(change.path, change.before ?? '')
  else if (change.kind === 'create') await env.io.trash([change.path])
  else return change
  return { ...change, state: 'undone' }
}

const toContent = (m: Message): Content => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text || '(proposed changes)' }] })
/** Earlier messages as model input: text only. */
export const historyContents = (messages: Message[]): Content[] => messages.map(toContent)

let n = 0
const newId = () => `${Date.now().toString(36)}-${(n++).toString(36)}`

export type TurnDeps = {
  /** One model call. */
  call: (contents: Content[]) => Promise<Content>
  ctx: Ctx
  mode: ApplyMode
  /** Applies a change (Auto mode). Throws to refuse. */
  apply: (change: Change) => Promise<Change>
}

const MAX_ROUNDS = 4

/** Runs the model until it answers in text: each allowed function call becomes a change (applied at once in Auto mode). */
export async function runTurn(deps: TurnDeps, history: Content[]): Promise<{ text: string; changes: Change[] }> {
  const contents = [...history]
  const changes: Change[] = []
  let text = ''
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const reply = await deps.call(contents)
    contents.push(reply)
    text = reply.parts.map((p) => p.text ?? '').join('').trim() || text
    const calls = reply.parts.flatMap((p) => (p.functionCall ? [p.functionCall] : []))
    if (!calls.length) break
    const responses: Content = { role: 'user', parts: [] }
    for (const call of calls) {
      const checked = checkCall(call, deps.ctx)
      let response: Record<string, unknown>
      if (!checked.ok) response = { error: checked.error }
      else {
        let change: Change = { ...checked.change, id: newId(), state: 'pending' }
        try {
          if (deps.mode === 'auto') change = await deps.apply(change)
          changes.push(change)
          response = { result: change.state === 'applied' ? 'applied' : 'waiting for the user to accept' }
        } catch (e) {
          response = { error: e instanceof Error ? e.message : String(e) }
        }
      }
      responses.parts.push({ functionResponse: { name: call.name, response } })
    }
    contents.push(responses)
  }
  return { text, changes }
}

/** Chats are kept 7 days after their last message. */
export const isExpired = (chat: Pick<Chat, 'updated'>, now = Date.now()) => now - chat.updated > WEEK

/** Deletes expired chats from `store`; returns how many. */
export async function pruneChats(store: { all(): Promise<Chat[]>; delete(id: string): Promise<void> }, now = Date.now()) {
  const old = (await store.all()).filter((c) => isExpired(c, now))
  for (const c of old) await store.delete(c.id)
  return old.length
}

export function newChat(vault: string, now = Date.now()): Chat {
  return { id: newId(), vault, created: now, updated: now, title: 'New chat', messages: [], extra: [] }
}
