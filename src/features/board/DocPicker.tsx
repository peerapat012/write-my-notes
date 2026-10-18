import { FileText, Search } from 'lucide-react'
import { useState } from 'react'
import Dialog from '@/components/Dialog'

type Props = { docs: string[]; onPick: (path: string) => void; onClose: () => void; title?: string }

/** Pick one of the notes folder's docs by name. */
export default function DocPicker({ docs, onPick, onClose, title = 'Add a doc' }: Props) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = docs.filter((d) => d.toLowerCase().includes(q)).slice(0, 50)
  return (
    <Dialog aria-label={title} onClose={onClose} padded={false}>
      <label className="flex items-center gap-2.5 border-b border-neutral-200 px-4">
        <Search size={16} className="shrink-0 text-neutral-400" />
        <input
          autoFocus
          aria-label="Search docs"
          placeholder="Search docs…"
          className="h-11 min-w-0 flex-1 bg-transparent outline-none placeholder:text-neutral-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && shown[0] && onPick(shown[0])}
        />
      </label>
      <ul className="max-h-80 overflow-auto p-1">
        {shown.map((d) => (
          <li key={d}>
            <button className="flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-left transition-colors duration-150 hover:bg-neutral-100" onClick={() => onPick(d)}>
              <FileText size={16} className="shrink-0 text-neutral-500" />
              <span className="truncate">{d.replace(/\.md$/, '')}</span>
            </button>
          </li>
        ))}
        {!shown.length && <li className="px-3 py-2 text-neutral-500">No docs match.</li>}
      </ul>
    </Dialog>
  )
}
