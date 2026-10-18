import { ArrowDown, ArrowUp, FileText, Presentation, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import EmptyState from '@/components/EmptyState'
import PageIcon from '@/components/PageIcon'
import type { Entry } from '@/features/sidebar/tree'
import { buildRows, createdLabel, groupOf, sortRows, type PageRow, type SortKey } from './allPages'

const TABS = [
  ['all', 'All'],
  ['doc', 'Doc'],
  ['board', 'Board'],
] as const

// star (ticket 09), title, tags, created, updated
// Narrow window: star, title, updated. Wide: tags and created join in.
const COLUMNS = 'grid-cols-[2rem_minmax(0,1fr)_9rem] @3xl:grid-cols-[2rem_minmax(0,1fr)_minmax(0,10rem)_7rem_9rem]'
const WIDE = 'hidden @3xl:block'

const updatedLabel = (ms: number) => new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

type Props = { entries: Entry[]; go: (path: string) => void; favorites: Set<string>; toggleFavorite: (path: string) => void }

/** Every doc and board in one list: tabs by type, sortable columns, grouped by last change while sorted by Updated. */
export default function AllPagesPage({ entries, go, favorites, toggleFavorite }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'updated', dir: 'desc' })
  const all = useMemo(() => buildRows(entries), [entries])
  const rows = useMemo(() => sortRows(all.filter((r) => tab === 'all' || r.type === tab), sort.key, sort.dir), [all, tab, sort])

  const header = (key: SortKey, label: string) => (
    <button
      className="flex h-8 items-center gap-1 text-left text-xs font-medium text-neutral-500 transition-colors duration-150 hover:text-neutral-900"
      onClick={() => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'title' ? 'asc' : 'desc' }))}
    >
      {label}
      {sort.key === key && (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
    </button>
  )
  const ariaSort = (key: SortKey) => (sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none')

  return (
    <div className="@container mx-auto max-w-5xl px-8 pt-8 pb-32 @3xl:px-16">
      <h1 className="mb-4 text-[40px] leading-tight font-bold tracking-[-0.02em]">All pages</h1>
      <div role="tablist" className="mb-4 flex gap-1">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`h-7 rounded-md px-2.5 text-sm font-medium transition-colors duration-150 ${tab === id ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {!rows.length ? (
        <EmptyState icon={FileText} title={all.length ? 'No pages of this type' : 'No pages yet'}>
          {all.length ? 'Pick another tab to see the rest.' : 'Pages you create show up here.'}
        </EmptyState>
      ) : (
        <div role="table" aria-label="All pages">
          <div role="row" className={`grid ${COLUMNS} items-center gap-3 border-b border-neutral-200 px-2`}>
            <span role="columnheader" aria-label="Favorite" />
            <span role="columnheader" aria-sort={ariaSort('title')}>
              {header('title', 'Title')}
            </span>
            <span role="columnheader" className={`${WIDE} text-xs font-medium text-neutral-500`}>
              Tags
            </span>
            <span role="columnheader" className={WIDE} aria-sort={ariaSort('created')}>
              {header('created', 'Created')}
            </span>
            <span role="columnheader" aria-sort={ariaSort('updated')}>
              {header('updated', 'Updated')}
            </span>
          </div>
          {rows.map((row, i) => {
            const group = sort.key === 'updated' ? groupOf(row.updated) : ''
            const heading = group && (i === 0 || groupOf(rows[i - 1].updated) !== group) ? group : ''
            return (
              <div key={row.path} role="rowgroup">
                {heading && <div className="px-2 pt-5 pb-1 text-xs font-medium text-neutral-500">{heading}</div>}
                <Row row={row} go={go} starred={favorites.has(row.path)} onStar={() => toggleFavorite(row.path)} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Row({ row, go, starred, onStar }: { row: PageRow; go: (path: string) => void; starred: boolean; onStar: () => void }) {
  return (
    <div
      role="row"
      onClick={() => go(row.path)}
      className={`grid w-full ${COLUMNS} cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors duration-150 hover:bg-neutral-100`}
    >
      <span role="cell">
        <button
          aria-label={starred ? `Remove ${row.title} from favorites` : `Add ${row.title} to favorites`}
          aria-pressed={starred}
          title={starred ? 'Remove from favorites' : 'Add to favorites'}
          className={`grid size-6 place-items-center rounded transition-colors duration-150 hover:bg-neutral-200 ${starred ? 'text-accent' : 'text-neutral-400'}`}
          onClick={(e) => {
            e.stopPropagation()
            onStar()
          }}
        >
          <Star size={15} fill={starred ? 'currentColor' : 'none'} />
        </button>
      </span>
      <span role="cell" className="flex min-w-0 items-center gap-2.5">
        <span className="grid size-5 shrink-0 place-items-center">
          <PageIcon icon={row.icon} color={row.iconColor} fallback={row.type === 'doc' ? FileText : Presentation} />
        </span>
        <span className="min-w-0 text-left">
          <button className="block max-w-full truncate font-medium outline-offset-2">{row.title}</button>
          {row.preview && <span className="block truncate text-xs text-neutral-500">{row.preview}</span>}
        </span>
      </span>
      <span role="cell" className="hidden min-w-0 gap-1 @3xl:flex">
        {row.tags.slice(0, 2).map((t) => (
          <span key={t} className="truncate rounded bg-neutral-100 px-1.5 text-xs leading-5 text-neutral-700">
            {t}
          </span>
        ))}
        {row.tags.length > 2 && <span className="text-xs leading-5 text-neutral-500">+{row.tags.length - 2}</span>}
      </span>
      <span role="cell" className={`${WIDE} text-neutral-700 tabular-nums`}>
        {createdLabel(row)}
      </span>
      <span role="cell" className="text-neutral-700 tabular-nums">
        {updatedLabel(row.updated)}
      </span>
    </div>
  )
}
