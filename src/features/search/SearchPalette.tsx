import { FileText, Presentation, Search } from 'lucide-react'
import { useState } from 'react'
import Dialog from '@/components/Dialog'
import { MenuRow } from '@/components/Menu'
import { search, type SearchIndex } from './search'

type Props = { index: SearchIndex; go: (path: string) => void; onClose: () => void }

/** Ctrl+K palette, open while mounted: type to search page titles and doc text, arrows + Enter (or click) to open. */
export default function SearchPalette({ index, go, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const hits = search(index, query)

  function open(path: string) {
    onClose()
    go(path)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setSelected((s) => (s + step + hits.length) % Math.max(hits.length, 1))
    } else if (e.key === 'Enter' && hits[selected]) open(hits[selected].path)
  }

  return (
    <Dialog aria-label="Search pages" onClose={onClose} padded={false} className="mx-auto mt-[15vh] w-full max-w-xl">
      <label className="flex items-center gap-2.5 px-4">
        <Search size={16} className="shrink-0 text-neutral-400" />
        <input
          autoFocus
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls="search-hits"
          aria-activedescendant={hits[selected] ? `hit-${selected}` : undefined}
          placeholder="Search pages…"
          className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-neutral-500"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(0)
          }}
          onKeyDown={onKeyDown}
        />
        <kbd className="shrink-0 rounded border border-neutral-200 px-1.5 text-xs text-neutral-500">Esc</kbd>
      </label>
      {query.trim() && (
        <div id="search-hits" role="listbox" className="max-h-96 overflow-auto border-t border-neutral-200 p-1">
          {hits.map((hit, i) => (
            <MenuRow
              key={hit.path}
              id={`hit-${i}`}
              role="option"
              aria-selected={i === selected}
              active={i === selected}
              icon={hit.path.endsWith('.md') ? FileText : Presentation}
              label={hit.title}
              hint={<span className="ml-auto max-w-[45%] shrink-0 truncate pl-3 text-xs text-neutral-500">{hit.path}</span>}
              detail={hit.snippet}
              onMouseMove={() => setSelected(i)}
              onClick={() => open(hit.path)}
            />
          ))}
          {!hits.length && <div className="px-2 py-1.5 text-neutral-500">No pages match “{query.trim()}”</div>}
        </div>
      )}
    </Dialog>
  )
}
