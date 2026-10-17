import { FileText, Presentation, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { search, type SearchIndex } from './search'

/** Ctrl+K palette: type to search page titles and doc text, arrows + Enter (or click) to open. */
export default function SearchPalette({ index, go }: { index: SearchIndex; go: (path: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const hits = search(index, query)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault() // beat the browser's search bar and editor shortcuts (capture phase)
        e.stopPropagation()
        setQuery('')
        setSelected(0)
        dialog.current?.showModal()
      }
    }
    addEventListener('keydown', onKey, true)
    return () => removeEventListener('keydown', onKey, true)
  }, [])

  function open(path: string) {
    dialog.current?.close()
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
    <dialog
      ref={dialog}
      aria-label="Search pages"
      className="mx-auto mt-[15vh] w-full max-w-xl rounded-lg border border-neutral-200 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-black/20"
      onClick={(e) => e.target === dialog.current && dialog.current.close()}
    >
      <label className="flex items-center gap-2 border-b border-neutral-200 px-3">
        <Search size={16} className="text-neutral-400" />
        <input
          autoFocus
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls="search-hits"
          aria-activedescendant={hits[selected] ? `hit-${selected}` : undefined}
          placeholder="Search pages…"
          className="flex-1 py-3 outline-none"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(0)
          }}
          onKeyDown={onKeyDown}
        />
      </label>
      <ul id="search-hits" role="listbox" className="max-h-96 overflow-auto p-1">
        {hits.map((hit, i) => (
          <li
            key={hit.path}
            id={`hit-${i}`}
            role="option"
            aria-selected={i === selected}
            className={`cursor-pointer rounded px-2 py-1.5 ${i === selected ? 'bg-neutral-100' : ''}`}
            onMouseMove={() => setSelected(i)}
            onClick={() => open(hit.path)}
          >
            <div className="flex items-center gap-2">
              {hit.path.endsWith('.md') ? <FileText size={16} /> : <Presentation size={16} />}
              <span className="truncate">{hit.title}</span>
              <span className="ml-auto truncate text-xs text-neutral-400">{hit.path}</span>
            </div>
            {hit.snippet && <div className="truncate pl-6 text-xs text-neutral-500">{hit.snippet}</div>}
          </li>
        ))}
        {query.trim() && !hits.length && <li className="px-2 py-1.5 text-neutral-500">No pages found</li>}
      </ul>
    </dialog>
  )
}
