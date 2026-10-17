import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { panel } from '@/components/ui'
import { NO_KEY } from '@/ai/gemini'

type Props = { selected: number; onEdit: (instruction: string) => Promise<void> }

/** Top-bar AI popover: a prompt and the actions that use it. */
export default function AiPanel({ selected, onEdit }: Props) {
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const noKey = !import.meta.env.VITE_GEMINI_API_KEY

  async function run() {
    setBusy(true)
    setError('')
    try {
      await onEdit(prompt.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  return (
    <div role="dialog" aria-label="AI" className={`${panel} absolute top-3 right-3 z-30 flex w-80 flex-col gap-2 p-3`}>
      {noKey && <p className="rounded-md bg-neutral-100 p-2 text-[13px] text-neutral-700">{NO_KEY}</p>}
      <textarea
        aria-label="AI prompt"
        autoFocus
        rows={4}
        placeholder="e.g. translate to Thai, fix grammar, make shorter"
        className="resize-none rounded-md border border-neutral-200 bg-transparent p-2 text-[13px] outline-none focus:border-neutral-400"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button
        className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-neutral-900 text-[13px] font-medium text-white transition-opacity disabled:opacity-40"
        disabled={busy || noKey || !selected || !prompt.trim()}
        onClick={run}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {busy ? 'Editing…' : `Edit ${selected} selected`}
      </button>
      {error && (
        <p role="alert" className="text-[13px] text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
