import { FileText, Presentation } from 'lucide-react'
import PageIcon from '@/components/PageIcon'
import { openPage, usePage } from '@/lib/pages'
import LinkToolbar from './LinkToolbar'
import { plainText } from './wordCount'

type Props = { path?: string; title: string; editable: boolean; onText: () => void; onRemove: () => void }

const updated = (ms?: number) => (ms ? new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '')

/** A page link shown as a preview card: icon, title, the first lines of the doc, and when it last changed. */
export default function LinkCard({ path, title, editable, onText, onRemove }: Props) {
  const page = usePage(path)
  const preview = page?.type === 'doc' ? plainText(page.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 240) : ''
  return (
    <div className="group/card relative my-2">
      {page ? (
        <button
          type="button"
          className="block w-full rounded-lg border border-neutral-200 bg-white p-3 text-left transition-colors duration-150 hover:bg-neutral-50"
          onClick={(e) => openPage(page.path, e)}
        >
          <span className="flex items-center gap-2 font-semibold text-neutral-900">
            <span className="grid size-5 shrink-0 place-items-center text-[16px] leading-none">
              <PageIcon icon={page.icon} color={page.iconColor} size={18} fallback={page.type === 'doc' ? FileText : Presentation} />
            </span>
            <span className="truncate">{page.title}</span>
          </span>
          <span className="mt-1 line-clamp-2 block text-sm text-neutral-700">
            {page.type === 'board' ? 'Board' : preview || <span className="text-neutral-500">Preview of the doc will be displayed here.</span>}
          </span>
          <span className="mt-2 block text-xs text-neutral-500">Updated {updated(page.mtime)}</span>
        </button>
      ) : (
        <div className="rounded-lg border border-dashed border-danger p-3 text-sm text-danger">Broken link: page “{title}” not found</div>
      )}
      {editable && page && (
        <div className="absolute top-2 right-2 opacity-0 transition-opacity duration-150 group-focus-within/card:opacity-100 group-hover/card:opacity-100 print:hidden">
          <LinkToolbar path={page.path} card onText={onText} onRemove={onRemove} />
        </div>
      )}
    </div>
  )
}
