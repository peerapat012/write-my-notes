import { FileText, Loader2, Sparkles, StickyNote, Workflow, ListTree } from 'lucide-react'
import { useState } from 'react'
import { panel } from '@/components/ui'
import { geminiKey, NO_KEY } from '@/ai/gemini'
import type { Mode } from '@/ai/create'

type Props = {
  selected: number
  onEdit: (instruction: string) => Promise<void>
  onCreate: (mode: Mode, prompt: string, n: number) => Promise<void>
  onSummarize: () => Promise<void>
  openSettings: () => void
}

const MODES: [Mode, string, typeof Sparkles][] = [
  ['sticky', 'Sticky notes', StickyNote],
  ['flow', 'Flow diagram', Workflow],
  ['outline', 'Outline', ListTree],
]

/** Top-bar AI popover: a prompt and the actions that use it. */
export default function AiPanel({ selected, onEdit, onCreate, onSummarize, openSettings }: Props) {
  const [prompt, setPrompt] = useState('')
  const [n, setN] = useState(6)
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState('')
  const noKey = !geminiKey() // re-read each render: Settings is a modal over this page, so closing it re-renders

  async function run(what: string, action: () => Promise<void>) {
    setBusy(what)
    setError('')
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setBusy(undefined)
  }
  const off = !!busy || noKey || !prompt.trim()
  const action = 'flex h-8 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium transition-opacity disabled:opacity-40'

  return (
    <div role="dialog" aria-label="AI" className={`${panel} absolute top-3 right-3 z-30 flex w-80 flex-col gap-2 p-3`}>
      {noKey && (
        <p className="rounded-md bg-neutral-100 p-2 text-[13px] text-neutral-700">
          <button className="underline" onClick={openSettings}>
            {NO_KEY}
          </button>
        </p>
      )}
      <textarea
        aria-label="AI prompt"
        autoFocus
        rows={4}
        placeholder="e.g. translate to Thai, fix grammar, make shorter"
        className="resize-none rounded-md border border-neutral-200 bg-transparent p-2 text-[13px] outline-none focus:border-neutral-400"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button className={`${action} bg-neutral-900 text-white`} disabled={off || !selected} onClick={() => run('edit', () => onEdit(prompt.trim()))}>
        {busy === 'edit' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {busy === 'edit' ? 'Editing…' : `Edit ${selected} selected`}
      </button>
      <div className="mt-1 text-[12px] font-medium text-neutral-500">Create new</div>
      <label className="flex items-center gap-2 text-[13px] text-neutral-700">
        Items
        <input type="range" min={1} max={12} value={n} onChange={(e) => setN(+e.target.value)} className="flex-1" />
        <span className="w-5 tabular-nums">{n}</span>
      </label>
      <div className="grid grid-cols-3 gap-1">
        {MODES.map(([mode, label, Icon]) => (
          <button key={mode} className={`${action} flex-col border border-neutral-200 py-1.5 hover:bg-neutral-100`} disabled={off} onClick={() => run(mode, () => onCreate(mode, prompt.trim(), n))}>
            {busy === mode ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
            {label}
          </button>
        ))}
      </div>
      <button className={`${action} border border-neutral-200 hover:bg-neutral-100`} disabled={!!busy || noKey} onClick={() => run('summary', onSummarize)}>
        {busy === 'summary' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
        {busy === 'summary' ? 'Summarizing…' : 'Summarize this board'}
      </button>
      {error && (
        <p role="alert" className="text-[13px] text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
