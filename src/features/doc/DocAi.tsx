import { Check, Loader2, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { docAi } from '@/ai/doc'
import { geminiKey, NO_KEY } from '@/ai/gemini'
import { ghostButton, panel, primaryButton } from '@/components/ui'

type Props = {
  at: DOMRect // cursor or selection start, in viewport coordinates
  model: string
  selection: string // selected markdown; '' inserts at the cursor
  onAccept: (markdown: string) => void
  onClose: () => void // Discard: the doc is untouched
  openSettings: () => void
}

/** `/ai` popover in docs: instruction or prompt in, markdown preview out; nothing changes until Accept. */
export default function DocAi({ at, model, selection, onAccept, onClose, openSettings }: Props) {
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<string>()
  const noKey = !geminiKey() // re-read each render: Settings is a modal over this page

  async function run() {
    setBusy(true)
    setError('')
    try {
      setResult(await docAi(model, input.trim(), selection))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  return (
    <div
      role="dialog"
      aria-label="AI"
      className={`${panel} fixed z-40 flex w-96 flex-col gap-2 p-3`}
      style={{ left: Math.min(at.left, innerWidth - 400), top: Math.min(at.bottom + 6, innerHeight - 320) }}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        e.stopPropagation()
        onClose()
      }}
    >
      {noKey && (
        <p className="rounded-md bg-neutral-100 p-2 text-[13px] text-neutral-700">
          <button className="underline" onClick={openSettings}>
            {NO_KEY}
          </button>
        </p>
      )}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!busy && !noKey && input.trim()) run()
        }}
      >
        <Sparkles size={14} className="shrink-0 text-neutral-400" />
        <input
          autoFocus
          aria-label={selection ? 'AI instruction' : 'AI prompt'}
          placeholder={selection ? 'Rewrite, translate, fix grammar…' : 'Ask AI to write…'}
          className="h-8 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-neutral-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        {busy && <Loader2 size={14} className="shrink-0 animate-spin text-neutral-500" aria-label="Generating" />}
      </form>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
      {result !== undefined && (
        <>
          <pre aria-label="AI result" className="max-h-60 overflow-auto rounded-md bg-neutral-100 p-2 font-sans text-[13px] whitespace-pre-wrap">
            {result}
          </pre>
          <div className="flex justify-end gap-2">
            <button className={ghostButton} onClick={onClose}>
              <X size={14} /> Discard
            </button>
            <button className={primaryButton} autoFocus onClick={() => onAccept(result)}>
              <Check size={14} /> Accept
            </button>
          </div>
        </>
      )}
    </div>
  )
}
