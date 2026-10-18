import { DocVersion } from '@/features/history/VersionView'
import type { Vault } from '@/lib/fs'
import { resolvePath } from '@/lib/paths'

type Props = {
  vault: Vault
  /** Path of the board holding the card; `link` is relative to it. */
  board: string
  link: string
  /** The doc's current text, or undefined when the target is gone (deleted, in Trash, renamed outside the app). */
  text?: string
}

/** The inside of a doc card (an Excalidraw embeddable): the doc, read-only, under its title. */
export default function DocCard({ vault, board, link, text }: Props) {
  const path = resolvePath(board, link)
  const title = path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/, '')
  if (text === undefined)
    return (
      <div className="grid h-full place-items-center rounded-lg border border-dashed border-danger bg-white px-4 text-center text-sm text-danger">
        Broken link: doc “{title}” not found
      </div>
    )
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900">
      <div className="shrink-0 truncate border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 font-medium">{title}</div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <DocVersion vault={vault} path={path} text={text} className="px-4 py-2" />
      </div>
    </div>
  )
}
