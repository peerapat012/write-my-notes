import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { dismissToast, useToasts, type Toast } from '@/lib/toast'
import { panel } from './ui'

const ICONS = { info: Info, success: CheckCircle2, error: XCircle }
const COLORS = { info: 'text-neutral-500', success: 'text-[var(--icon-green)]', error: 'text-danger' }

function Item({ t }: { t: Toast }) {
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (t.kind === 'error' || paused) return
    const timer = setTimeout(() => dismissToast(t.id), 5000)
    return () => clearTimeout(timer)
  }, [t, paused])
  const Icon = ICONS[t.kind]
  return (
    <div
      role={t.kind === 'error' ? 'alert' : 'status'}
      className={`${panel} pointer-events-auto flex max-w-sm items-center gap-2.5 py-2 pr-1.5 pl-3 text-sm transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Icon size={16} className={`shrink-0 ${COLORS[t.kind]}`} />
      <span className="min-w-0 flex-1">{t.text}</span>
      {t.action && (
        <button
          className="h-6 shrink-0 rounded px-2 font-medium text-accent hover:bg-neutral-100"
          onClick={() => {
            t.action!.run()
            dismissToast(t.id)
          }}
        >
          {t.action.label}
        </button>
      )}
      <button aria-label="Close" className="grid size-6 shrink-0 place-items-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900" onClick={() => dismissToast(t.id)}>
        <X size={14} />
      </button>
    </div>
  )
}

/** The stack, bottom right. Mounted once in App. */
export default function Toasts() {
  const list = useToasts()
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2 print:hidden">
      {list.map((t) => (
        <Item key={t.id} t={t} />
      ))}
    </div>
  )
}
