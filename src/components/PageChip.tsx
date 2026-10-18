import { FileText, Presentation } from 'lucide-react'
import { openPage, usePage } from '@/lib/pages'
import PageIcon from './PageIcon'

/** A page link shown as icon + title; a click opens the peek view (Ctrl/Cmd+click: full screen). Missing: broken. */
export default function PageChip({ path, title }: { path?: string; title: string }) {
  const page = usePage(path)
  if (!page)
    return (
      <span className="inline-flex items-center gap-1 rounded px-1 text-danger line-through" title="Broken link: page not found">
        <FileText size={14} /> {title}
      </span>
    )
  return (
    <button
      type="button"
      className="inline-flex max-w-full items-center gap-1 rounded px-1 align-middle font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-3 transition-colors duration-150 hover:bg-neutral-100 hover:decoration-current"
      title={`${page.path} (Ctrl+click to open)`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        openPage(page.path, e)
      }}
    >
      <span className="grid size-4 shrink-0 place-items-center text-[14px] leading-none">
        <PageIcon icon={page.icon} color={page.iconColor} fallback={page.type === 'doc' ? FileText : Presentation} />
      </span>
      <span className="truncate">{page.title}</span>
    </button>
  )
}
