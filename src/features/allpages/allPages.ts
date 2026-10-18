import { getProps, splitFrontMatter } from '@/features/doc/frontmatter'
import { plainText } from '@/features/doc/wordCount'
import type { Entry } from '@/features/sidebar/tree'

export type PageRow = {
  path: string
  title: string
  type: 'doc' | 'board'
  icon?: string
  iconColor?: string
  preview: string
  tags: string[]
  created?: string // docs only
  updated: number // lastModified, ms
}

export type SortKey = 'title' | 'created' | 'updated'
export type Group = 'Today' | 'Yesterday' | 'This week' | 'Older'

const PREVIEW = 100

/** One row per doc and board. Pages in `.trash/` and `.templates/` are left out. */
export function buildRows(entries: Entry[]): PageRow[] {
  return entries.flatMap((e): PageRow[] => {
    const type: PageRow['type'] | undefined = e.path.endsWith('.md') ? 'doc' : e.path.endsWith('.excalidraw') ? 'board' : undefined
    if (!type || e.kind !== 'file' || /^\.(trash|templates)(\/|$)/.test(e.path)) return []
    const title = e.path.slice(e.path.lastIndexOf('/') + 1).replace(/\.(md|excalidraw)$/, '')
    const base = { path: e.path, title, type, icon: e.icon, iconColor: e.iconColor, updated: e.mtime ?? 0 }
    if (type === 'board') return [{ ...base, preview: oneLine((e.boardTexts ?? []).map((t) => t.text).join(' ')), tags: [] }]
    const { front } = splitFrontMatter(e.text ?? '')
    const { created, tags } = getProps(front)
    return [{ ...base, preview: oneLine(plainText(e.text ?? '')), tags, created }]
  })
}

const oneLine = (text: string) => {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > PREVIEW ? flat.slice(0, PREVIEW) + '…' : flat
}

const startOfDay = (ms: number) => new Date(ms).setHours(0, 0, 0, 0)

/** Local calendar days: Today, Yesterday, the 5 days before that (This week), then Older. */
export function groupOf(updated: number, now = Date.now()): Group {
  const days = Math.round((startOfDay(now) - startOfDay(updated)) / 864e5)
  return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : days <= 6 ? 'This week' : 'Older'
}

/** Rows sorted by a column; boards have no created date, so they sort as the oldest. */
export function sortRows(rows: PageRow[], key: SortKey, dir: 'asc' | 'desc'): PageRow[] {
  const sign = dir === 'asc' ? 1 : -1
  const by = (a: PageRow, b: PageRow) =>
    key === 'title' ? a.title.localeCompare(b.title, undefined, { numeric: true }) : key === 'updated' ? a.updated - b.updated : (a.created ?? '').localeCompare(b.created ?? '')
  return [...rows].sort((a, b) => sign * by(a, b) || a.title.localeCompare(b.title))
}

/** Created column text: the date, or "—" for a board or a doc without one. */
export const createdLabel = (row: PageRow) => (row.created ? new Date(row.created).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—')
