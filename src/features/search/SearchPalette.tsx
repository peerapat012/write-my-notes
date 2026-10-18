import { FileText, Presentation, Search, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import Dialog from '@/components/Dialog'
import { MenuRow } from '@/components/Menu'
import PageIcon from '@/components/PageIcon'
import { shortcut } from '@/components/ui'
import type { PageRow } from '@/features/allpages/allPages'
import { search, type Hit, type SearchIndex } from './search'

export type PaletteAction = { label: string; icon: LucideIcon; shortcut?: string; run: () => void }

type Props = {
  index: SearchIndex
  icons: Map<string, { icon?: string; iconColor?: string }>
  recent: PageRow[]
  actions: PaletteAction[]
  go: (path: string, elementId?: string) => void
  onClose: () => void
}

type Item = { key: string; group: string; row: () => Omit<React.ComponentProps<typeof MenuRow>, 'active'>; run: () => void }

/** Ctrl+K palette, open while mounted. Empty: recent pages and actions. Typing: page title, doc and board text
 * matches, then matching actions. Arrows + Enter (or click) to open. */
export default function SearchPalette({ index, icons, recent, actions, go, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const q = query.trim().toLowerCase()

  const pageIcon = (path: string) => <PageIcon icon={icons.get(path)?.icon} color={icons.get(path)?.iconColor} fallback={path.endsWith('.md') ? FileText : Presentation} />
  const folder = (path: string): ReactNode =>
    path.includes('/') && <span className="ml-auto max-w-[45%] shrink-0 truncate pl-3 text-xs text-neutral-500">{path.slice(0, path.lastIndexOf('/'))}</span>
  const pages: Item[] = q
    ? search(index, query).map((hit: Hit) => ({
        key: hit.path,
        group: 'Pages',
        row: () => ({ leading: pageIcon(hit.path), label: hit.title, hint: folder(hit.path), detail: hit.snippet }),
        run: () => go(hit.path, hit.elementId),
      }))
    : recent.map((r) => ({ key: r.path, group: 'Recent', row: () => ({ leading: pageIcon(r.path), label: r.title, hint: folder(r.path) }), run: () => go(r.path) }))
  const acts: Item[] = actions
    .filter((a) => a.label.toLowerCase().includes(q))
    .map((a) => ({ key: 'action:' + a.label, group: 'Actions', row: () => ({ icon: a.icon, label: a.label, hint: a.shortcut && <kbd className={shortcut}>{a.shortcut}</kbd> }), run: a.run }))
  const items = [...pages, ...acts]

  function open(item: Item) {
    onClose()
    item.run()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setSelected((s) => (s + step + items.length) % Math.max(items.length, 1))
    } else if (e.key === 'Enter' && items[selected]) open(items[selected])
  }

  return (
    <Dialog aria-label="Search pages and actions" onClose={onClose} padded={false} className="mx-auto mt-[15vh] w-[calc(100%-2rem)] max-w-xl">
      <label className="flex items-center gap-2.5 px-4">
        <Search size={16} className="shrink-0 text-neutral-500" />
        <input
          autoFocus
          role="combobox"
          aria-expanded={items.length > 0}
          aria-controls="search-hits"
          aria-activedescendant={items[selected] ? `hit-${selected}` : undefined}
          placeholder="Search pages or actions…"
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
      <div id="search-hits" role="listbox" className="max-h-[min(28rem,60vh)] overflow-auto border-t border-neutral-200 p-1">
        {items.map((item, i) => (
          <div key={item.key} role="presentation">
            {item.group !== items[i - 1]?.group && <div className={`px-2 pt-2 pb-1 text-xs font-medium text-neutral-500 ${i ? 'mt-1' : ''}`}>{item.group}</div>}
            <MenuRow id={`hit-${i}`} role="option" aria-selected={i === selected} active={i === selected} {...item.row()} onMouseMove={() => setSelected(i)} onClick={() => open(item)} />
          </div>
        ))}
        {!items.length && <div className="px-2 py-1.5 text-neutral-500">Nothing matches “{query.trim()}”</div>}
      </div>
    </Dialog>
  )
}
