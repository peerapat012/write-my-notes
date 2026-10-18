import { ArrowUpRight, Eye, Unlink } from 'lucide-react'
import { nav } from '@/lib/pages'
import { panel } from '@/components/ui'

type Props = { path: string; card: boolean; onText: () => void; onCard?: () => void; onRemove: () => void }

const seg = 'h-6 rounded px-2 text-xs font-medium transition-colors duration-150'
const icon = 'grid size-6 place-items-center rounded text-neutral-500 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900'

/** The small toolbar of a page link: Text / Card, Open (peek), Open page, Remove link. */
export default function LinkToolbar({ path, card, onText, onCard, onRemove }: Props) {
  return (
    <div role="toolbar" aria-label="Page link" className={`${panel} flex items-center gap-0.5 p-0.5`} onMouseDown={(e) => e.preventDefault()}>
      <div className="flex rounded-md bg-neutral-100 p-0.5">
        <button type="button" aria-pressed={!card} className={`${seg} ${card ? 'text-neutral-500 hover:text-neutral-900' : 'bg-white text-neutral-900 shadow-sm'}`} onClick={() => card && onText()}>
          Text
        </button>
        <button type="button" aria-pressed={card} className={`${seg} ${card ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`} onClick={() => !card && onCard?.()}>
          Card
        </button>
      </div>
      <button type="button" className={icon} title="Open (peek)" aria-label="Open in peek" onClick={() => nav.peek(path)}>
        <Eye size={14} />
      </button>
      <button type="button" className={icon} title="Open page" aria-label="Open page" onClick={() => nav.go(path)}>
        <ArrowUpRight size={14} />
      </button>
      <button type="button" className={icon} title="Remove link" aria-label="Remove link" onClick={onRemove}>
        <Unlink size={14} />
      </button>
    </div>
  )
}
