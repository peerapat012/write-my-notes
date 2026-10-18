import { ArrowUpRight, Copy, Eye, MoreHorizontal, Unlink } from 'lucide-react'
import { MenuButton } from '@/components/Menu'
import { nav } from '@/lib/pages'
import { toast } from '@/lib/toast'
import { panel } from '@/components/ui'

type Props = { path: string; card: boolean; onText: () => void; onCard?: () => void; onRemove: () => void }

const seg = 'h-6 rounded px-2 text-xs font-medium transition-colors duration-150'
const icon = 'grid size-7 place-items-center rounded text-neutral-500 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900'

/** The floating toolbar of a page link (AFFiNE: height 36, gap 8): Link / Card, Open page, Peek, Copy link, More. */
export default function LinkToolbar({ path, card, onText, onCard, onRemove }: Props) {
  return (
    <div role="toolbar" aria-label="Page link" className={`${panel} flex h-9 items-center gap-2 px-1.5`} onMouseDown={(e) => e.preventDefault()}>
      <div className="flex rounded-md bg-neutral-100 p-0.5">
        <button type="button" aria-pressed={!card} className={`${seg} ${card ? 'text-neutral-500 hover:text-neutral-900' : 'bg-white text-neutral-900 shadow-sm'}`} onClick={() => card && onText()}>
          Link
        </button>
        <button type="button" aria-pressed={card} className={`${seg} ${card ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`} onClick={() => !card && onCard?.()}>
          Card
        </button>
      </div>
      <button type="button" className={icon} title="Open page" aria-label="Open page" onClick={() => nav.go(path)}>
        <ArrowUpRight size={15} />
      </button>
      <button type="button" className={icon} title="Open (peek)" aria-label="Open in peek" onClick={() => nav.peek(path)}>
        <Eye size={15} />
      </button>
      <button
        type="button"
        className={icon}
        title="Copy link"
        aria-label="Copy link"
        onClick={() => navigator.clipboard.writeText(path).then(() => toast('Link copied'), () => toast('Could not copy the link', 'error'))}
      >
        <Copy size={15} />
      </button>
      <MenuButton label="More" className={icon} groups={[{ items: [{ label: 'Remove link', icon: Unlink, danger: true, onSelect: onRemove }] }]}>
        <MoreHorizontal size={15} />
      </MenuButton>
    </div>
  )
}
