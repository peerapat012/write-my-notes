import { CalendarDays, FileText, LayoutTemplate, Presentation, type LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import PageIcon from '@/components/PageIcon'
import type { Entry } from '@/features/sidebar/tree'
import { buildRows, recentRows, relativeTime, type PageRow } from './allPages'

type Props = {
  name: string // the notes folder
  entries: Entry[]
  favorites: string[]
  go: (path: string) => void
  newDoc: () => void
  newBoard: () => void
  openToday: () => void
  fromTemplate: () => void
}

/** The "no page open" screen: quick actions, recent pages, favorites. */
export default function StartPage({ name, entries, favorites, go, newDoc, newBoard, openToday, fromTemplate }: Props) {
  const rows = useMemo(() => buildRows(entries), [entries])
  const recent = useMemo(() => recentRows(rows), [rows])
  const favRows = favorites.flatMap((p) => rows.filter((r) => r.path === p))
  const actions: [string, LucideIcon, () => void][] = [
    ['New doc', FileText, newDoc],
    ['New board', Presentation, newBoard],
    ['Today', CalendarDays, openToday],
    ['New from template', LayoutTemplate, fromTemplate],
  ]
  return (
    <div className="fade-in mx-auto max-w-3xl px-10 pt-16 pb-32 md:px-16">
      <h1 className="text-title font-bold tracking-[-0.02em]">{name}</h1>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map(([label, Icon, run]) => (
          <button
            key={label}
            className="flex h-20 flex-col items-start justify-between rounded-lg border border-neutral-200 p-3 text-left text-sm font-medium transition-colors duration-150 hover:bg-neutral-50 active:bg-neutral-100"
            onClick={run}
          >
            <Icon size={18} className="text-neutral-500" />
            {label}
          </button>
        ))}
      </div>
      <PageList label="Recent" rows={recent} go={go} empty="Pages you edit show up here." />
      {favRows.length > 0 && <PageList label="Favorites" rows={favRows} go={go} />}
    </div>
  )
}

function PageList({ label, rows, go, empty }: { label: string; rows: PageRow[]; go: (path: string) => void; empty?: string }) {
  return (
    <section aria-label={label} className="mt-10">
      <h2 className="mb-1 px-2 text-xs font-medium text-neutral-500">{label}</h2>
      {rows.length ? (
        <ul>
          {rows.map((r) => (
            <li key={r.path}>
              <button
                className="flex h-10 w-full items-center gap-2.5 rounded-lg px-2 text-left transition-colors duration-150 hover:bg-neutral-100"
                onClick={() => go(r.path)}
              >
                <span className="grid size-5 shrink-0 place-items-center text-[16px] leading-none">
                  <PageIcon icon={r.icon} color={r.iconColor} size={18} fallback={r.type === 'doc' ? FileText : Presentation} />
                </span>
                <span className="truncate font-medium">{r.title}</span>
                {r.path.includes('/') && <span className="truncate text-neutral-500">{r.path.slice(0, r.path.lastIndexOf('/'))}</span>}
                <span className="ml-auto shrink-0 pl-3 text-xs text-neutral-500">{r.updated ? relativeTime(r.updated) : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-2 text-neutral-500">{empty}</p>
      )}
    </section>
  )
}
