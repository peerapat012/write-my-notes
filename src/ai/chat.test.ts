import { expect, test } from 'vitest'
import { applyChange, checkCall, isExpired, newChat, pruneChats, runTurn, undoChange, WEEK, type Change, type Chat, type Ctx, type Env } from './chat'
import type { Content } from './gemini'

const ctx: Ctx = { context: ['A.md', 'notes/B.md'], board: undefined, exists: (p) => ['A.md', 'notes/B.md', 'C.md'].includes(p) }

test('an edit to a page in the context is allowed', () => {
  expect(checkCall({ name: 'edit_doc', args: { path: 'notes/B.md', markdown: 'new' } }, ctx)).toEqual({ ok: true, change: { kind: 'edit', path: 'notes/B.md', markdown: 'new' } })
})

test('an edit to a page outside the context is refused', () => {
  const r = checkCall({ name: 'edit_doc', args: { path: 'C.md', markdown: 'x' } }, ctx)
  expect(r.ok).toBe(false)
})

test('delete-like requests have no tool', () => {
  for (const name of ['delete_page', 'rename_page', 'move_page', 'delete_doc'])
    expect(checkCall({ name, args: { path: 'A.md' } }, ctx).ok).toBe(false)
})

test('create_doc needs a new, valid path', () => {
  expect(checkCall({ name: 'create_doc', args: { path: 'New/Idea.md', markdown: '# x' } }, ctx).ok).toBe(true)
  for (const path of ['A.md', '../x.md', '.trash/x.md', 'a/.hidden.md', '/abs.md', 'x.txt', 'a//b.md', 'we:ird.md'])
    expect(checkCall({ name: 'create_doc', args: { path, markdown: '' } }, ctx).ok, path).toBe(false)
})

test('add_to_board needs an open board and a known kind', () => {
  const call = { name: 'add_to_board', args: { kind: 'flow', prompt: 'login' } }
  expect(checkCall(call, ctx).ok).toBe(false)
  expect(checkCall(call, { ...ctx, board: 'B.excalidraw' })).toEqual({ ok: true, change: { kind: 'board', path: 'B.excalidraw', boardKind: 'flow', prompt: 'login' } })
  expect(checkCall({ ...call, args: { kind: 'spiral', prompt: 'x' } }, { ...ctx, board: 'B.excalidraw' }).ok).toBe(false)
})

function fake() {
  const files = new Map<string, string>([['A.md', '---\ncreated: 1\n---\nold'], ['notes/B.md', 'b']])
  const trashed: string[] = []
  const env: Env = {
    io: {
      read: async (p) => files.get(p)!,
      write: async (p, d) => void files.set(p, d),
      createPage: async (dir, name) => {
        const p = dir ? `${dir}/${name}.md` : `${name}.md`
        files.set(p, '')
        return p
      },
      trash: async (ps) => void ps.forEach((p) => (trashed.push(p), files.delete(p))),
    },
    now: { created: '2026-10-18T09:00', date: '2026-10-18' },
  }
  return { files, trashed, env }
}
const pending = (over: Partial<Change>): Change => ({ id: '1', kind: 'edit', path: 'A.md', markdown: 'new text', state: 'pending', ...over })

test('accept writes, keeping the doc’s front matter; undo writes the old content back', async () => {
  const { files, env } = fake()
  const done = await applyChange(env, pending({}))
  expect(done.state).toBe('applied')
  expect(files.get('A.md')).toBe('---\ncreated: 1\n---\nnew text')
  const undone = await undoChange(env, done)
  expect(undone.state).toBe('undone')
  expect(files.get('A.md')).toBe('---\ncreated: 1\n---\nold')
})

test('a created doc gets a fresh created; undo sends it to the Trash', async () => {
  const { files, trashed, env } = fake()
  const done = await applyChange(env, pending({ kind: 'create', path: 'New/Idea.md', markdown: '# Idea' }))
  expect(files.get('New/Idea.md')).toBe('---\ncreated: 2026-10-18T09:00\n---\n# Idea')
  await undoChange(env, done)
  expect(trashed).toEqual(['New/Idea.md'])
})

test('a board change runs the board generator; without a board it fails', async () => {
  const { env } = fake()
  const calls: unknown[] = []
  const change = pending({ kind: 'board', path: 'B.excalidraw', boardKind: 'flow', prompt: 'login' })
  await expect(applyChange(env, change)).rejects.toThrow()
  const done = await applyChange({ ...env, board: async (m, p) => void calls.push([m, p]) }, change)
  expect(calls).toEqual([['flow', 'login']])
  expect(await undoChange(env, done)).toBe(done) // the board's own Undo does this one
})

const say = (text: string): Content => ({ role: 'model', parts: [{ text }] })
const call = (name: string, args: Record<string, unknown>): Content => ({ role: 'model', parts: [{ functionCall: { name, args } }] })

function model(...replies: Content[]) {
  const seen: Content[][] = []
  return { seen, call: async (c: Content[]) => (seen.push([...c]), replies.shift()!) }
}

test('Approve: the change waits, nothing is written', async () => {
  const { files, env } = fake()
  const m = model(call('edit_doc', { path: 'A.md', markdown: 'new text' }), say('Done, please accept.'))
  const out = await runTurn({ call: m.call, ctx, mode: 'approve', apply: (c) => applyChange(env, c) }, [{ role: 'user', parts: [{ text: 'rewrite A' }] }])
  expect(out.text).toBe('Done, please accept.')
  expect(out.changes.map((c) => c.state)).toEqual(['pending'])
  expect(files.get('A.md')).toContain('old')
  // The model was told the change is waiting.
  expect(JSON.stringify(m.seen[1].at(-1))).toContain('waiting')
})

test('Auto: the change is applied at once', async () => {
  const { files, env } = fake()
  const m = model(call('edit_doc', { path: 'A.md', markdown: 'new text' }), say('Done.'))
  const out = await runTurn({ call: m.call, ctx, mode: 'auto', apply: (c) => applyChange(env, c) }, [{ role: 'user', parts: [{ text: 'rewrite A' }] }])
  expect(out.changes[0].state).toBe('applied')
  expect(files.get('A.md')).toContain('new text')
})

test('a refused call makes no change and the model is told why', async () => {
  const { files, env } = fake()
  const m = model(call('edit_doc', { path: 'C.md', markdown: 'x' }), call('delete_page', { path: 'A.md' }), say('Sorry, I cannot.'))
  const out = await runTurn({ call: m.call, ctx, mode: 'auto', apply: (c) => applyChange(env, c) }, [{ role: 'user', parts: [{ text: 'edit C, delete A' }] }])
  expect(out.changes).toEqual([])
  expect(out.text).toBe('Sorry, I cannot.')
  expect(files.get('A.md')).toContain('old')
  expect(JSON.stringify(m.seen[1].at(-1))).toContain('error')
})

test('chats expire 7 days after the last message', async () => {
  const now = 100 * WEEK
  const mk = (id: string, updated: number): Chat => ({ ...newChat('v', updated), id })
  const chats = [mk('fresh', now - WEEK + 1000), mk('edge', now - WEEK), mk('old', now - WEEK - 1), mk('ancient', now - 30 * WEEK)]
  expect(chats.map((c) => isExpired(c, now))).toEqual([false, false, true, true])
  const left = new Map(chats.map((c) => [c.id, c]))
  const removed = await pruneChats({ all: async () => [...left.values()], delete: async (id) => void left.delete(id) }, now)
  expect(removed).toBe(2)
  expect([...left.keys()]).toEqual(['fresh', 'edge'])
})
