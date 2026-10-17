import type { DialogHTMLAttributes } from 'react'
import { panel } from './ui'

type Props = { onClose?: () => void; padded?: boolean } & DialogHTMLAttributes<HTMLDialogElement>

/** Modal dialog, open while mounted. With `onClose`, Esc and a backdrop click close it. */
export default function Dialog({ onClose, padded = true, className = 'm-auto w-full max-w-sm', children, ...rest }: Props) {
  return (
    <dialog
      ref={(d) => void (d && !d.open && d.showModal())}
      onClose={onClose}
      onClick={(e) => onClose && e.target === e.currentTarget && e.currentTarget.close()}
      className={`${panel} ${className} p-0 text-sm transition-[opacity,scale] duration-150 ease-out backdrop:bg-black/30 dark:backdrop:bg-black/55 starting:scale-[0.98] starting:opacity-0`}
      {...rest}
    >
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </dialog>
  )
}
