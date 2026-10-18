import { ICON_COLORS } from '@/lib/icons'
import { cell, cells } from './tasks'

// A ```datatable block: one `@schema {json}` line, then a GFM table whose first column is Title.

export const TYPES = ['text', 'number', 'progress', 'select', 'multi-select', 'checkbox', 'date', 'link', 'page'] as const
export type ColType = (typeof TYPES)[number]
export type Option = { n: string; c: string } // name, color from the icon palette
/** `type` is kept as written: an unknown type works as Text until the column is retyped. Column 0 is Title. */
export type Column = { name: string; type: string; options?: Option[]; summary?: string; w?: number }
export const DEFAULT_COL_WIDTH = 180
export const MIN_COL_WIDTH = 100
export type Sort = { col: number; dir: 'asc' | 'desc' }
/** A view of the table. Kanban groups by a Select column, Calendar lays rows out by a Date column (`groupBy`, a column index). */
export const VIEW_TYPES = ['table', 'kanban', 'calendar'] as const
export type ViewType = (typeof VIEW_TYPES)[number]
export type View = { type: ViewType; groupBy?: number }
/** `views` missing means one Table view. */
export type Table = { title: string; cols: Column[]; rows: string[][]; sort?: Sort; views?: View[] }

/** What a column behaves as: Title and unknown types are Text. */
export const kindOf = (col: Column): ColType => (TYPES as readonly string[]).includes(col.type) ? (col.type as ColType) : 'text'

type Schema = {
  title?: string
  types?: string[]
  options?: Record<string, Option[]>
  sort?: Sort
  summary?: Record<string, string>
  w?: Record<string, number>
  views?: { type: string; groupBy?: unknown }[]
}

export function parseTable(text: string): Table {
  const lines = text.split(/\r?\n/)
  let schema: Schema = {}
  if (lines[0]?.startsWith('@schema')) {
    try {
      schema = JSON.parse(lines[0].slice('@schema'.length)) ?? {}
    } catch {
      schema = {} // broken schema: every column is Text; the next edit writes a new one
    }
  }
  const rows = lines.filter((l) => l.trim().startsWith('|')).map(cells).filter((c) => !c.every((x) => /^:?-+:?$/.test(x)))
  const header = rows.shift() ?? ['Title']
  const cols: Column[] = header.map((name, i) => {
    if (!i) return { name: name || 'Title', type: 'title' }
    const col: Column = { name, type: schema.types?.[i - 1] ?? 'text' }
    if (schema.options?.[i]) col.options = schema.options[i]
    if (schema.summary?.[i]) col.summary = schema.summary[i]
    return col
  })
  if (schema.summary?.[0]) cols[0].summary = schema.summary[0]
  cols.forEach((c, i) => {
    const w = schema.w?.[i]
    if (typeof w === 'number' && Number.isFinite(w) && w >= MIN_COL_WIDTH) c.w = Math.round(w)
  })
  const sort = schema.sort && schema.sort.col >= 0 && schema.sort.col < cols.length ? schema.sort : undefined
  return { title: schema.title ?? 'Untitled', cols, rows: rows.map((r) => cols.map((_, i) => r[i] ?? '')), sort, views: normalizeViews(Array.isArray(schema.views) ? schema.views : undefined, cols) }
}

export function serializeTable(t: Table) {
  const schema: Schema = { title: t.title.replace(/\s*\n\s*/g, ' '), types: t.cols.slice(1).map((c) => c.type) }
  const options = Object.fromEntries(t.cols.flatMap((c, i) => (c.options?.length ? [[i, c.options]] : [])))
  if (Object.keys(options).length) schema.options = options
  if (t.sort) schema.sort = t.sort
  const summary = Object.fromEntries(t.cols.flatMap((c, i) => (c.summary && c.summary !== 'none' ? [[i, c.summary]] : [])))
  if (Object.keys(summary).length) schema.summary = summary
  const w = Object.fromEntries(t.cols.flatMap((c, i) => (c.w ? [[i, c.w]] : [])))
  if (Object.keys(w).length) schema.w = w
  const views = normalizeViews(t.views, t.cols)
  if (views && !(views.length === 1 && views[0].type === 'table')) schema.views = views
  const line = (c: string[]) => `| ${c.map(cell).join(' | ')} |`
  return [`@schema ${JSON.stringify(schema)}`, line(t.cols.map((c) => c.name)), `|${t.cols.map(() => '---').join('|')}|`, ...t.rows.map(line)].join('\n')
}

/** A new table: Title and two Text columns, two empty rows. */
export const NEW_TABLE = serializeTable({
  title: 'Untitled',
  cols: [{ name: 'Title', type: 'title' }, { name: 'Column', type: 'text' }, { name: 'Column 2', type: 'text' }],
  rows: [['', '', ''], ['', '', '']],
})

// Columns. Title (0) is never moved, deleted or retyped; callers disable those items.

/** "Column", then "Column 2", "Column 3"... whichever is free. */
export function columnName(t: Table) {
  const names = new Set(t.cols.map((c) => c.name))
  let name = 'Column'
  for (let i = 2; names.has(name); i++) name = `Column ${i}`
  return name
}

const splice = <T>(list: T[], at: number, del: number, ...add: T[]) => [...list.slice(0, at), ...add, ...list.slice(at + del)]

/** Sort column after a column change: `map` gives the old column's new index (undefined: gone). */
const remapSort = (sort: Sort | undefined, map: (i: number) => number | undefined) => {
  const col = sort && map(sort.col)
  return sort && col !== undefined ? { ...sort, col } : undefined
}

export function insertColumn(t: Table, at: number, col: Column = { name: columnName(t), type: 'text' }, values?: string[]): Table {
  at = Math.max(1, Math.min(at, t.cols.length))
  return {
    ...t,
    cols: splice(t.cols, at, 0, col),
    rows: t.rows.map((r, i) => splice(r, at, 0, values?.[i] ?? '')),
    sort: remapSort(t.sort, (i) => (i >= at ? i + 1 : i)),
    views: remapViews(t, [...t.cols.slice(0, at), col, ...t.cols.slice(at)], (i) => (i >= at ? i + 1 : i)),
  }
}

export const renameColumn = (t: Table, i: number, name: string): Table => ({
  ...t,
  cols: t.cols.map((c, j) => (j === i ? { ...c, name: name.replace(/\s*\n\s*/g, ' ').trim() || c.name } : c)),
})

/** Sets a column's width, never below the minimum. */
export const setColumnWidth = (t: Table, i: number, w: number): Table => mapCol(t, i, (c) => ({ ...c, w: Math.max(MIN_COL_WIDTH, Math.round(w)) }))

// Views

const VIEW_KIND = { kanban: 'select', calendar: 'date' } as const

/** Views with each Kanban or Calendar view kept only if its column is still there and of the right type; the others become Table. */
export function normalizeViews(views: { type: string; groupBy?: unknown }[] | undefined, cols: Column[]): View[] | undefined {
  const out = (views ?? []).flatMap((v): View[] => {
    if (!(VIEW_TYPES as readonly string[]).includes(v.type)) return []
    const type = v.type as ViewType
    if (type === 'table') return [{ type }]
    const i = v.groupBy
    const ok = typeof i === 'number' && Number.isInteger(i) && i >= 1 && i < cols.length && kindOf(cols[i]) === VIEW_KIND[type]
    return [ok ? { type, groupBy: i } : { type: 'table' }]
  })
  return out.length ? out : undefined
}

/** `t`'s views after a column change: `cols` are the new columns, `map` gives an old column's new index (undefined: gone). */
const remapViews = (t: Table, cols: Column[], map: (i: number) => number | undefined) =>
  normalizeViews(t.views?.map((v) => ({ ...v, groupBy: v.groupBy === undefined ? undefined : map(v.groupBy) })), cols)

export const viewsOf = (t: Table): View[] => t.views ?? [{ type: 'table' }]

/** Columns a Kanban (Select) or Calendar (Date) view can use. */
export const viewColumns = (t: Table, type: ViewType) => t.cols.flatMap((c, i) => (i >= 1 && type !== 'table' && kindOf(c) === VIEW_KIND[type] ? [i] : []))

/** Adds a view on the first fitting column; unchanged when the table has none. */
export function addView(t: Table, type: ViewType): Table {
  const groupBy = viewColumns(t, type)[0]
  if (type !== 'table' && groupBy === undefined) return t
  return { ...t, views: [...viewsOf(t), type === 'table' ? { type } : { type, groupBy }] }
}

/** Removes view `i`; the last one stays. */
export const deleteView = (t: Table, i: number): Table => (viewsOf(t).length < 2 ? t : { ...t, views: viewsOf(t).filter((_, j) => j !== i) })

/** Points view `i` at column `col`, if its type can use it. */
export const setViewColumn = (t: Table, i: number, col: number): Table =>
  viewsOf(t)[i]?.type !== 'table' && viewColumns(t, viewsOf(t)[i].type).includes(col) ? { ...t, views: viewsOf(t).map((v, j) => (j === i ? { ...v, groupBy: col } : v)) } : t

export type Group = { option?: Option; rows: number[] }

/** Kanban columns: `rows` (default all) grouped by the options of Select column `col`, then those with no (known) value. */
export function groupRows(t: Table, col: number, rows = t.rows.map((_, i) => i)): Group[] {
  const groups: Group[] = (t.cols[col].options ?? []).map((option) => ({ option, rows: [] }))
  const none: Group = { rows: [] }
  for (const r of rows) (groups.find((g) => g.option!.n === t.rows[r][col].trim()) ?? none).rows.push(r)
  return [...groups, none]
}

/** The weeks of a month (`month` 0-11), Sunday first, as `YYYY-MM-DD`; days of the neighbouring months pad the first and last week. */
export function monthGrid(year: number, month: number): string[][] {
  const first = Date.UTC(year, month, 1)
  const lead = new Date(first).getUTCDay()
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return Array.from({ length: Math.ceil((lead + days) / 7) }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => new Date(first + (w * 7 + d - lead) * 864e5).toISOString().slice(0, 10)),
  )
}

/** Calendar: row indices (of `rows`, default all) by the date in column `col`; a cell that is not a valid date is left out. */
export function rowsByDate(t: Table, col: number, rows = t.rows.map((_, i) => i)) {
  const days = new Map<string, number[]>()
  for (const r of rows) {
    const day = t.rows[r][col].trim()
    if (validDate(day)) days.set(day, [...(days.get(day) ?? []), r])
  }
  return days
}

export const canMove = (t: Table, i: number, dir: -1 | 1) => i >= 1 && i + dir >= 1 && i + dir < t.cols.length

export function moveColumn(t: Table, i: number, dir: -1 | 1): Table {
  if (!canMove(t, i, dir)) return t
  const j = i + dir
  const swap = <T>(list: T[]) => list.map((x, k) => (k === i ? list[j] : k === j ? list[i] : x))
  return { ...t, cols: swap(t.cols), rows: t.rows.map(swap), sort: remapSort(t.sort, (k) => (k === i ? j : k === j ? i : k)), views: remapViews(t, swap(t.cols), (k) => (k === i ? j : k === j ? i : k)) }
}

export function duplicateColumn(t: Table, i: number): Table {
  const names = new Set(t.cols.map((c) => c.name))
  let name = `${t.cols[i].name} copy`
  for (let n = 2; names.has(name); n++) name = `${t.cols[i].name} copy ${n}`
  const col = { ...t.cols[i], name, type: i ? t.cols[i].type : 'text' }
  return insertColumn(t, i + 1, col, t.rows.map((r) => r[i]))
}

export function deleteColumn(t: Table, i: number): Table {
  if (i < 1) return t
  return {
    ...t,
    cols: t.cols.filter((_, j) => j !== i),
    rows: t.rows.map((r) => r.filter((_, j) => j !== i)),
    sort: remapSort(t.sort, (k) => (k === i ? undefined : k > i ? k - 1 : k)),
    views: remapViews(t, t.cols.filter((_, j) => j !== i), (k) => (k === i ? undefined : k > i ? k - 1 : k)),
  }
}

export const columnEmpty = (t: Table, i: number) => t.rows.every((r) => !r[i]?.trim())

/** Retypes a column; cell text is kept. Becoming Select or Multi-select turns the values into options. */
export function setColumnType(t: Table, i: number, type: ColType): Table {
  if (i < 1) return t
  let col: Column = { ...t.cols[i], type }
  if ((type === 'select' || type === 'multi-select') && !col.options?.length) {
    col = { ...col, options: [] }
    for (const r of t.rows) for (const v of type === 'select' ? [r[i].trim()] : splitMulti(r[i])) if (v) col = addOptionTo(col, v)
  }
  if (col.summary && !summariesFor(type).includes(col.summary)) col.summary = undefined
  const cols = t.cols.map((c, j) => (j === i ? col : c))
  return { ...t, cols, views: normalizeViews(t.views, cols) }
}

// Rows

const emptyRow = (t: Table) => t.cols.map(() => '')
export const insertRow = (t: Table, at: number): Table => ({ ...t, rows: splice(t.rows, at, 0, emptyRow(t)) })
/** A new last row with `values` (by column index) filled in. */
export const insertRowWith = (t: Table, values: Record<number, string>): Table => ({ ...t, rows: [...t.rows, t.cols.map((_, i) => values[i] ?? '')] })
export const duplicateRow = (t: Table, r: number): Table => ({ ...t, rows: splice(t.rows, r + 1, 0, [...t.rows[r]]) })
export const deleteRow = (t: Table, r: number): Table => ({ ...t, rows: t.rows.filter((_, i) => i !== r) })
export const setCell = (t: Table, r: number, c: number, value: string): Table => ({
  ...t,
  rows: t.rows.map((row, i) => (i === r ? row.map((v, j) => (j === c ? value.replace(/\s*\n\s*/g, ' ') : v)) : row)),
})

// Select options

export const cleanOption = (name: string) => name.replace(/[,|]/g, '').trim()

function addOptionTo(col: Column, name: string): Column {
  const options = col.options ?? []
  if (!name || options.some((o) => o.n === name)) return col
  const used = new Set(options.map((o) => o.c))
  const c = ICON_COLORS.find((x) => !used.has(x)) ?? ICON_COLORS[options.length % ICON_COLORS.length]
  return { ...col, options: [...options, { n: name, c }] }
}

const mapCol = (t: Table, i: number, fn: (c: Column) => Column): Table => ({ ...t, cols: t.cols.map((c, j) => (j === i ? fn(c) : c)) })

/** Adds option `name` (cleaned) with the next unused color; a name already there is kept as is. */
export const addOption = (t: Table, i: number, name: string) => mapCol(t, i, (c) => addOptionTo(c, cleanOption(name)))

/** Cells of column `i` with each option name passed through `fn` (undefined drops it). */
function mapValues(t: Table, i: number, fn: (v: string) => string | undefined): Table {
  const multi = t.cols[i].type === 'multi-select'
  return {
    ...t,
    rows: t.rows.map((r) =>
      r.map((v, j) => (j !== i ? v : multi ? joinMulti(splitMulti(v).flatMap((x) => fn(x) ?? [])) : v.trim() ? (fn(v.trim()) ?? '') : v)),
    ),
  }
}

export function renameOption(t: Table, i: number, from: string, to: string): Table {
  to = cleanOption(to)
  if (!to || to === from || t.cols[i].options?.some((o) => o.n === to)) return t
  const renamed = mapCol(t, i, (c) => ({ ...c, options: c.options?.map((o) => (o.n === from ? { ...o, n: to } : o)) }))
  return mapValues(renamed, i, (v) => (v === from ? to : v))
}

export function removeOption(t: Table, i: number, name: string): Table {
  const removed = mapCol(t, i, (c) => ({ ...c, options: c.options?.filter((o) => o.n !== name) }))
  return mapValues(removed, i, (v) => (v === name ? undefined : v))
}

export const recolorOption = (t: Table, i: number, name: string, color: string) =>
  mapCol(t, i, (c) => ({ ...c, options: c.options?.map((o) => (o.n === name ? { ...o, c: color } : o)) }))

// Cell values

export const CHECKED = '[x]'
export const UNCHECKED = '[ ]'
export const isChecked = (v: string) => /^\[[xX]\]$/.test(v.trim())
export const splitMulti = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean)
export const joinMulti = (values: string[]) => values.join(', ')

const DATE = /^\d{4}-\d{2}-\d{2}$/
/** `YYYY-MM-DD` of a real day (no 2026-02-30). */
export const validDate = (v: string) => DATE.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v
/** A progress cell's number held to 0-100; other text is kept as written. */
export const clampProgress = (v: string) => (validNumber(v) ? String(Math.min(100, Math.max(0, Number(v)))) : v.trim() ? v : '')
/** The bar fill (0-100) of a progress cell; text that is not a number draws an empty bar. */
export const progressValue = (v: string) => (validNumber(v) ? Math.min(100, Math.max(0, Number(v))) : 0)
export const validNumber = (v: string) => v.trim() !== '' && Number.isFinite(Number(v))

/** Page links in a cell: `[Title](path.md)` entries joined by `, `. */
const LINK = /\[([^\]]*)\]\(([^)\s]+)\)/g
export const pageLinks = (v: string) => [...v.matchAll(LINK)].map((m) => ({ title: m[1], href: m[2] }))
export const pageCell = (links: { title: string; href: string }[]) => links.map((l) => `[${l.title.replace(/[[\]]/g, '')}](${l.href})`).join(', ')

/** Whether a cell's text fits its column's type; a misfit is shown as-is with a warning mark. Empty always fits. */
export function fits(col: Column, v: string) {
  v = v.trim()
  if (!v) return true
  const names = new Set(col.options?.map((o) => o.n))
  switch (kindOf(col)) {
    case 'number':
    case 'progress':
      return validNumber(v)
    case 'date':
      return validDate(v)
    case 'checkbox':
      return /^\[[ xX]\]$/.test(v)
    case 'select':
      return names.has(v)
    case 'multi-select':
      return splitMulti(v).every((x) => names.has(x))
    case 'page':
      return v.replace(LINK, '').replace(/[,\s]/g, '') === ''
    default:
      return true
  }
}

// Search and sort (shown order only; the file keeps its order)

export const rowMatches = (row: string[], query: string) => !query.trim() || row.some((v) => v.toLowerCase().includes(query.trim().toLowerCase()))

/** Row indices in shown order: sorted by `t.sort`, empty cells last in either direction. */
export function sortedRows(t: Table) {
  const order = t.rows.map((_, i) => i)
  if (!t.sort) return order
  const { col, dir } = t.sort
  const kind = kindOf(t.cols[col])
  const key = (v: string) => (kind === 'page' ? pageLinks(v).map((l) => l.title).join(', ') : v.trim())
  const empty = (v: string) => !key(v)
  return order.sort((a, b) => {
    const x = t.rows[a][col]
    const y = t.rows[b][col]
    if (empty(x) || empty(y)) return empty(x) === empty(y) ? a - b : empty(x) ? 1 : -1
    let d: number
    if ((kind === 'number' || kind === 'progress') && validNumber(x) && validNumber(y)) d = Number(x) - Number(y)
    else if (kind === 'checkbox') d = Number(isChecked(x)) - Number(isChecked(y))
    else d = key(x).localeCompare(key(y), undefined, { numeric: true, sensitivity: 'base' })
    return (dir === 'asc' ? d : -d) || a - b
  })
}

// Summary

export const SUMMARY_LABELS: Record<string, string> = {
  none: 'None',
  count: 'Count all',
  empty: 'Count empty',
  filled: 'Count filled',
  'empty%': '% empty',
  'filled%': '% filled',
  sum: 'Sum',
  avg: 'Average',
  min: 'Min',
  max: 'Max',
  checked: 'Count checked',
  'checked%': '% checked',
}

const BASE = ['none', 'count', 'empty', 'filled', 'empty%', 'filled%']
export const summariesFor = (type: string) =>
  type === 'number' || type === 'progress' ? [...BASE, 'sum', 'avg', 'min', 'max'] : type === 'checkbox' ? [...BASE, 'checked', 'checked%'] : BASE

const SHORT: Record<string, string> = { count: 'COUNT', empty: 'EMPTY', filled: 'FILLED', 'empty%': 'EMPTY', 'filled%': 'FILLED', sum: 'SUM', avg: 'AVERAGE', min: 'MIN', max: 'MAX', checked: 'CHECKED', 'checked%': 'CHECKED' }

const fmt = (n: number) => String(Math.round(n * 100) / 100)
const pct = (part: number, all: number) => `${all ? fmt((part / all) * 100) : '0'}%`

/** The summary slot's text for column `i` (for example "EMPTY 33.33%"), or '' for none. Over every row. */
export function summaryText(t: Table, i: number) {
  const kind = t.cols[i].summary
  if (!kind || kind === 'none' || !SHORT[kind]) return ''
  const values = t.rows.map((r) => r[i] ?? '')
  const checkbox = kindOf(t.cols[i]) === 'checkbox'
  const isEmpty = (v: string) => !v.trim() || (checkbox && !isChecked(v))
  const empty = values.filter(isEmpty).length
  const numbers = values.filter(validNumber).map(Number)
  const checked = values.filter(isChecked).length
  const value = {
    count: String(values.length),
    empty: String(empty),
    filled: String(values.length - empty),
    'empty%': pct(empty, values.length),
    'filled%': pct(values.length - empty, values.length),
    sum: fmt(numbers.reduce((a, b) => a + b, 0)),
    avg: numbers.length ? fmt(numbers.reduce((a, b) => a + b, 0) / numbers.length) : '–',
    min: numbers.length ? fmt(Math.min(...numbers)) : '–',
    max: numbers.length ? fmt(Math.max(...numbers)) : '–',
    checked: String(checked),
    'checked%': pct(checked, values.length),
  }[kind]
  return `${SHORT[kind]} ${value}`
}

/** Dev sheet sample (/dev/ui): every column type, so the grid can be checked by eye. */
export const SAMPLE_TABLE = `@schema {"title":"Sprint","types":["select","date","checkbox","number","link","progress"],"options":{"1":[{"n":"Not started","c":"gray"},{"n":"Done","c":"green"}]},"summary":{"1":"empty%"},"views":[{"type":"table"},{"type":"kanban","groupBy":1},{"type":"calendar","groupBy":2}]}
| Title | Status | Due | Done | Points | Site | Progress |
|---|---|---|---|---|---|---|
| Write the spec | Done | 2026-10-20 | [x] | 3 | https://example.com | 100 |
| Review | Not started |  | [ ] | 5 |  | 40 |
|  |  |  | [ ] |  |  |  |`
