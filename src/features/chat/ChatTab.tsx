import { Check, Eye, History, Loader2, Plus, Send, Sparkles, Undo2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { applyChange, FUNCTIONS, historyContents, keepFront, newChat, runTurn, systemPrompt, undoChange, type ApplyMode, type Change, type Chat, type Env, type Message } from '@/ai/chat'
import { chatStore, recentChats } from '@/ai/chatStore'
import type { Mode } from '@/ai/create'
import { chatTurn, geminiKey, NO_KEY } from '@/ai/gemini'
import { ghostButton, iconButton } from '@/components/ui'
import { createdStamp, type Vault } from '@/lib/fs'
import { localDate } from '@/features/templates/daily'

/** What the open board offers the chat. */
export type BoardChat = { create: (mode: Mode, prompt: string, n: number) => Promise<void> }

type Props = {
  vault: Vault
  /** The open page: sent as context automatically. */
  page: string | null
  /** Every doc and board, for the @ picker and for "does this path exist". */
  pages: string[]
  /** Text of a page for the model: a doc's markdown, or a board's texts. */
  pageText: (path: string) => string | undefined
  model: string
  openSettings: () => void
  /** Writes pending edits to disk. */
  flush: () => Promise<unknown>
  /** A page was written: rescan and reload the open page. */
  onChanged: () => void
  onPreview: (path: string, markdown: string) => void
  board: React.RefObject<BoardChat | undefined>
}

const MODE_KEY = 'write-my-notes:chat-mode'
const name = (path: string) => path.slice(path.lastIndexOf('/') + 1).replace(/\.(md|excalidraw)$/, '')
const stored = (): ApplyMode => (localStorage.getItem(MODE_KEY) === 'auto' ? 'auto' : 'approve')

/** Right panel tab: chat about the open page (and pages added with @); the AI edits through functions, with or without approval. */
export default function ChatTab({ vault, page, pages, pageText, model, openSettings, flush, onChanged, onPreview, board }: Props) {
  const [chat, setChat] = useState<Chat>(() => newChat(vault.id))
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<ApplyMode>(stored)
  const [history, setHistory] = useState<Chat[]>()
  const end = useRef<HTMLDivElement>(null)
  const noKey = !geminiKey()
  const all = useMemo(() => new Set(pages), [pages])

  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [chat.messages.length, busy])
  // Coming back to the tab continues the latest chat instead of showing an empty one.
  useEffect(() => {
    recentChats(vault.id).then(
      (list) => list[0] && setChat((now) => (now.messages.length ? now : list[0])),
      () => {},
    )
  }, [vault.id])

  const env = (): Env => ({
    io: vault,
    now: { created: createdStamp(), date: localDate() },
    board: board.current ? (m, p) => board.current!.create(m, p, 6) : undefined,
  })

  async function save(next: Chat) {
    setChat(next)
    await chatStore.put(next).catch(() => {}) // a store that is unavailable must not stop the chat
  }

  /** Applies one change after writing pending edits; board changes only run on the board they were meant for. */
  async function applyOne(change: Change) {
    await flush()
    if (change.kind === 'board' && change.path !== page) throw new Error('Open that board first.')
    const done = await applyChange(env(), change)
    if (change.kind !== 'board') onChanged()
    return done
  }

  async function send() {
    const text = input.trim()
    if (!text || busy || noKey) return
    setInput('')
    setError('')
    setBusy(true)
    const asked: Chat = { ...chat, title: chat.messages.length ? chat.title : text.slice(0, 40), updated: Date.now(), messages: [...chat.messages, { role: 'user', text }] }
    setChat(asked)
    try {
      const open = page ? [page] : []
      const paths = [...new Set([...open, ...chat.extra])].filter((p) => all.has(p))
      const ctx = { context: paths.filter((p) => p.endsWith('.md')), board: page?.endsWith('.excalidraw') ? page : undefined, exists: (p: string) => all.has(p) }
      const system = systemPrompt(paths.map((path) => ({ path, text: pageText(path) ?? '' })))
      const { text: reply, changes } = await runTurn(
        { call: (contents) => chatTurn(model, system, contents, FUNCTIONS), ctx, mode, apply: applyOne },
        [...historyContents(chat.messages), { role: 'user', parts: [{ text }] }],
      )
      await save({ ...asked, updated: Date.now(), messages: [...asked.messages, { role: 'assistant', text: reply, changes }] })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      await save({ ...asked, messages: [...asked.messages, { role: 'assistant', text: '', error: message }] })
    }
    setBusy(false)
  }

  /** Replaces one change in the chat, then stores the chat. */
  const setChange = (at: number, change: Change) =>
    save({ ...chat, updated: Date.now(), messages: chat.messages.map((m, i) => (i === at ? { ...m, changes: m.changes?.map((c) => (c.id === change.id ? change : c)) } : m)) })

  async function act(at: number, change: Change, what: 'accept' | 'discard' | 'undo') {
    setError('')
    try {
      if (what === 'discard') return setChange(at, { ...change, state: 'discarded' })
      if (what === 'accept') return setChange(at, await applyOne(change))
      const undone = await undoChange(env(), change)
      onChanged()
      return setChange(at, undone)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function preview(change: Change) {
    if (change.kind === 'board') return
    onPreview(change.path, change.kind === 'edit' ? keepFront(pageText(change.path) ?? '', change.markdown ?? '') : (change.markdown ?? ''))
  }

  const mention = /(^|\s)@([^\s@]*)$/.exec(input)
  const matches = mention ? pages.filter((p) => p.toLowerCase().includes(mention[2].toLowerCase()) && !chat.extra.includes(p) && p !== page).slice(0, 6) : []

  const asking = (
    <form
      className="mt-2 shrink-0"
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
    >
      {matches.length > 0 && (
        <ul aria-label="Pages" className="mb-1 rounded-md border border-neutral-200 bg-white p-1">
          {matches.map((p) => (
            <li key={p}>
              <button
                type="button"
                className="block h-7 w-full truncate rounded px-2 text-left hover:bg-neutral-100"
                onClick={() => {
                  setChat({ ...chat, extra: [...chat.extra, p] })
                  setInput(input.replace(/@[^\s@]*$/, ''))
                }}
              >
                {p.replace(/\.(md|excalidraw)$/, '')}
              </button>
            </li>
          ))}
        </ul>
      )}
      <textarea
        aria-label="Message"
        rows={3}
        placeholder="Ask about this page. Type @ to add another."
        className="w-full resize-none rounded-md border border-neutral-300 bg-white p-2 text-sm outline-none focus:border-neutral-500"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            send()
          }
        }}
      />
      <div className="mt-1 flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-neutral-500">
          Changes
          <select
            aria-label="Apply changes"
            className="h-7 rounded-md border border-neutral-200 bg-transparent px-1.5 text-xs text-neutral-900"
            value={mode}
            onChange={(e) => {
              const next = e.target.value as ApplyMode
              localStorage.setItem(MODE_KEY, next)
              setMode(next)
            }}
          >
            <option value="approve">Approve</option>
            <option value="auto">Auto</option>
          </select>
        </label>
        <button className={`${iconButton} ml-auto`} disabled={busy || noKey || !input.trim()} title="Send" aria-label="Send">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </form>
  )

  return (
    <div className="flex h-full min-h-[24rem] flex-col text-sm">
      <div className="mb-2 flex shrink-0 items-center gap-1">
        <span className="mr-auto truncate px-1 font-medium">{history ? 'Recent chats' : chat.title}</span>
        <button className={iconButton} title="New chat" aria-label="New chat" onClick={() => (setChat(newChat(vault.id)), setHistory(undefined), setError(''))}>
          <Plus size={16} />
        </button>
        <button className={iconButton} title="Chat history" aria-label="Chat history" aria-pressed={!!history} onClick={() => (history ? setHistory(undefined) : recentChats(vault.id).then(setHistory, () => setHistory([])))}>
          <History size={16} />
        </button>
      </div>
      {noKey && (
        <p className="mb-2 rounded-md bg-neutral-100 p-2 text-[13px] text-neutral-700">
          <button className="underline" onClick={openSettings}>
            {NO_KEY}
          </button>
        </p>
      )}
      {history ? (
        <ul aria-label="Recent chats" className="min-h-0 flex-1 overflow-auto">
          {history.map((c) => (
            <li key={c.id}>
              <button
                className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-neutral-100"
                onClick={() => (setChat(c), setHistory(undefined))}
              >
                <span className="block truncate">{c.title}</span>
                <span className="block text-xs text-neutral-500">{new Date(c.updated).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </button>
            </li>
          ))}
          {!history.length && <li className="px-2 py-1 text-neutral-500">No chats in the last 7 days.</li>}
        </ul>
      ) : (
        <>
          <div className="mb-2 flex shrink-0 flex-wrap gap-1" aria-label="Context">
            {page && <span className="rounded bg-neutral-200 px-1.5 text-xs leading-5 text-neutral-700">{name(page)} (open)</span>}
            {chat.extra.map((p) => (
              <span key={p} className="inline-flex items-center gap-1 rounded bg-neutral-200 py-0 pr-1 pl-1.5 text-xs leading-5 text-neutral-700">
                {name(p)}
                <button aria-label={`Remove ${name(p)} from context`} className="text-neutral-500 hover:text-neutral-900" onClick={() => setChat({ ...chat, extra: chat.extra.filter((x) => x !== p) })}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-auto">
            {!chat.messages.length && (
              <p className="flex items-start gap-1.5 px-1 text-neutral-500">
                <Sparkles size={14} className="mt-0.5 shrink-0" /> Ask a question, or ask for a change like “add a summary at the top”.
              </p>
            )}
            {chat.messages.map((m, i) => (
              <Bubble key={i} message={m} onAct={(c, what) => act(i, c, what)} onPreview={preview} />
            ))}
            {busy && (
              <p className="flex items-center gap-1.5 px-1 text-neutral-500">
                <Loader2 size={14} className="animate-spin" /> Thinking…
              </p>
            )}
            <div ref={end} />
          </div>
          {error && (
            <p role="alert" className="mt-1 text-[13px] text-danger">
              {error}
            </p>
          )}
          {asking}
        </>
      )}
    </div>
  )
}

function Bubble({ message, onAct, onPreview }: { message: Message; onAct: (c: Change, what: 'accept' | 'discard' | 'undo') => void; onPreview: (c: Change) => void }) {
  if (message.role === 'user') return <p className="ml-6 rounded-lg bg-neutral-100 px-3 py-2 whitespace-pre-wrap">{message.text}</p>
  return (
    <div className="space-y-2">
      {message.text && <p className="px-1 whitespace-pre-wrap">{message.text}</p>}
      {message.error && (
        <p role="alert" className="px-1 text-danger">
          {message.error}
        </p>
      )}
      {message.changes?.map((c) => <ChangeCard key={c.id} change={c} onAct={(what) => onAct(c, what)} onPreview={() => onPreview(c)} />)}
    </div>
  )
}

const WHAT: Record<Change['kind'], string> = { edit: 'Edit', create: 'New doc', board: 'Add to board' }

function ChangeCard({ change, onAct, onPreview }: { change: Change; onAct: (what: 'accept' | 'discard' | 'undo') => void; onPreview: () => void }) {
  const small = `${ghostButton} h-7 px-2 text-[13px]`
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-2">
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs font-medium text-neutral-500">{WHAT[change.kind]}</span>
        <span className="min-w-0 flex-1 truncate font-medium" title={change.path}>
          {name(change.path)}
        </span>
        {change.state !== 'pending' && <span className="text-xs text-neutral-500">{{ applied: 'Applied', discarded: 'Discarded', undone: 'Undone', pending: '' }[change.state]}</span>}
      </div>
      {change.kind === 'board' && <p className="mt-0.5 truncate text-xs text-neutral-500">{change.boardKind}: {change.prompt}</p>}
      <div className="mt-1.5 flex gap-1">
        {change.state === 'pending' && (
          <>
            {change.kind !== 'board' && (
              <button className={small} onClick={onPreview}>
                <Eye size={14} /> Preview
              </button>
            )}
            <button className={small} onClick={() => onAct('accept')}>
              <Check size={14} /> Accept
            </button>
            <button className={small} onClick={() => onAct('discard')}>
              <X size={14} /> Discard
            </button>
          </>
        )}
        {change.state === 'applied' && change.kind !== 'board' && (
          <button className={small} onClick={() => onAct('undo')}>
            <Undo2 size={14} /> Undo
          </button>
        )}
      </div>
    </div>
  )
}
