import { FileText, Presentation } from 'lucide-react'
import { usePages } from '@/lib/pages'
import Menu from './Menu'
import PageIcon from './PageIcon'

type Props = { anchor: DOMRect; onPick: (path: string) => void; onClose: () => void; exclude?: string[] }

/** The `@` page picker: docs and boards, filtered as you type (same list and icons as the AI chat's `@`). */
export default function PagePicker({ anchor, onPick, onClose, exclude = [] }: Props) {
  const pages = usePages().filter((p) => !exclude.includes(p.path))
  return (
    <Menu
      label="Link to page"
      anchor={anchor}
      searchable
      width="w-72"
      onClose={onClose}
      groups={[
        {
          label: 'Link to page',
          items: pages.map((p) => ({
            label: p.title,
            leading: (
              <span className="grid size-4 shrink-0 place-items-center text-[14px] leading-none">
                <PageIcon icon={p.icon} color={p.iconColor} fallback={p.type === 'doc' ? FileText : Presentation} />
              </span>
            ),
            shortcut: p.path.includes('/') ? p.path.slice(0, p.path.lastIndexOf('/')) : undefined,
            onSelect: () => onPick(p.path),
          })),
        },
      ]}
    />
  )
}
