import { type LucideIcon, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { panel } from './ui'

export type PeekButton = { label: string; icon: LucideIcon; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; pressed?: boolean }

type Props = { label: string; onClose: () => void; buttons: PeekButton[]; children: ReactNode; aside?: ReactNode }

/** A page (or a table record) in a centered modal over the current page. Close and `buttons` sit in a stack outside
 * the top right edge. Esc, Close or a backdrop click close it; the dialog returns focus to the opener. */
export default function Peek({ label, onClose, buttons, children, aside }: Props) {
  return (
    <dialog
      aria-label={label}
      ref={(d) => void (d && !d.open && d.showModal())}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-auto h-[90vh] max-h-none w-[calc(100%-1.5rem)] max-w-[960px] overflow-visible bg-transparent p-0 text-sm text-neutral-900 transition-[opacity,scale] duration-200 ease-out backdrop:bg-black/30 sm:w-[calc(100%-6rem)] dark:backdrop:bg-black/55 starting:scale-[0.98] starting:opacity-0"
    >
      <div className={`${panel} relative h-full overflow-auto rounded-xl`}>{children}</div>
      <div className="absolute top-2 right-2 flex gap-1 sm:top-0 sm:right-auto sm:left-[calc(100%+8px)] sm:flex-col">
        {[{ label: 'Close', icon: X, onClick: (e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.closest('dialog')!.close() } as PeekButton, ...buttons].map(({ label, icon: Icon, onClick, pressed }) => (
          <button
            key={label}
            title={label}
            aria-label={label}
            aria-pressed={pressed}
            onClick={onClick}
            className={`grid size-8 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-500 shadow-panel transition-colors duration-150 hover:text-neutral-900 ${pressed ? 'text-neutral-900' : ''}`}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
      {aside}
    </dialog>
  )
}
