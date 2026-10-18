import {
  AlertTriangle,
  ArrowDown,
  ArrowDownNarrowWide,
  ArrowLeft,
  ArrowLeftToLine,
  ArrowRight,
  ArrowRightToLine,
  ArrowUp,
  ArrowUpNarrowWide,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Columns3,
  CircleChevronDown,
  Copy,
  FileText,
  Gauge,
  GripVertical,
  Hash,
  Link,
  ListChecks,
  Maximize2,
  MoreHorizontal,
  Palette,
  Plus,
  Search,
  SquareCheck,
  Table2,
  Trash2,
  Type,
  X,
  type LucideIcon,
} from 'lucide-react'
import { createElement, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { EditorView } from '@milkdown/kit/prose/view'
import { setText } from './tasksView'
import Dialog from '@/components/Dialog'
import Menu, { MenuButton, type MenuGroup } from '@/components/Menu'
import PageChip from '@/components/PageChip'
import PagePicker from '@/components/PagePicker'
import Peek from '@/components/Peek'
import { dangerButton, ghostButton, iconButton, input } from '@/components/ui'
import { localDate } from '@/features/templates/daily'
import { ICON_COLORS } from '@/lib/icons'
import { pageLink, pageTarget } from '@/lib/pages'
import {
  addOption,
  addView,
  canMove,
  CHECKED,
  clampProgress,
  columnEmpty,
  DEFAULT_COL_WIDTH,
  deleteColumn,
  deleteRow,
  deleteView,
  duplicateColumn,
  duplicateRow,
  fits,
  groupRows,
  insertColumn,
  insertRow,
  insertRowWith,
  isChecked,
  joinMulti,
  kindOf,
  MIN_COL_WIDTH,
  monthGrid,
  moveColumn,
  pageLinks,
  progressValue,
  parseTable,
  recolorOption,
  removeOption,
  rowsByDate,
  renameColumn,
  renameOption,
  rowMatches,
  serializeTable,
  setCell,
  setColumnType,
  setColumnWidth,
  setViewColumn,
  sortedRows,
  splitMulti,
  SUMMARY_LABELS,
  summariesFor,
  summaryText,
  TYPES,
  UNCHECKED,
  validDate,
  viewColumns,
  viewsOf,
  type ColType,
  type Column,
  type Table,
  type ViewType,
} from './datatable'

const TYPE_INFO: Record<ColType, [string, LucideIcon]> = {
  text: ['Text', Type],
  number: ['Number', Hash],
  progress: ['Progress', Gauge],
  select: ['Select', CircleChevronDown],
  'multi-select': ['Multi-select', ListChecks],
  checkbox: ['Checkbox', SquareCheck],
  date: ['Date', Calendar],
  link: ['Link', Link],
  page: ['Page', FileText],
}
const iconOf = (col: Column) => TYPE_INFO[kindOf(col)][1]
const TypeIcon = ({ col, size = 14 }: { col: Column; size?: number }) => createElement(iconOf(col), { size, className: 'shrink-0' })

const RAIL = 24 // left rail: row grip
const ADD = 40 // add-column button
const cellBorder = 'border-r border-b border-neutral-200'

const VIEW_INFO: Record<ViewType, [string, LucideIcon]> = { table: ['Table', Table2], kanban: ['Kanban', Columns3], calendar: ['Calendar', Calendar] }

type Update = (fn: (t: Table) => Table) => void

type Props = {
  text: string
  commit: (text: string) => void
  remove: () => void
  docPath: string
  readOnly?: boolean
}

/** A ```datatable block shown as a database-style table (AFFiNE's Table View). Every edit rewrites the block text. */
export default function TableBlock({ text, commit, remove, docPath, readOnly }: Props) {
  const table = useMemo(() => parseTable(text), [text])
  const update: Update = (fn) => commit(serializeTable(fn(table)))
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const pending = useRef<{ r: number; c: number }>(undefined) // a cell to focus once the table has re-rendered
  const [record, setRecord] = useState<number>() // row open in the Expand record peek
  const [confirmDelete, setConfirmDelete] = useState<number>() // column whose delete waits for a yes
  const [editOptions, setEditOptions] = useState<number>() // column whose options dialog is open
  const [viewIndex, setViewIndex] = useState(0) // the open view tab (not saved)
  const [drag, setDrag] = useState<{ i: number; w: number }>() // column being resized, and its live width
  const root = useRef<HTMLDivElement>(null)
  const sorted = !!table.sort
  const views = viewsOf(table)
  const viewAt = Math.min(viewIndex, views.length - 1)
  const view = views[viewAt]
  const label = (i: number) => {
    const same = views.filter((v) => v.type === views[i].type)
    return VIEW_INFO[views[i].type][0] + (same.length > 1 ? ` ${same.indexOf(views[i]) + 1}` : '')
  }
  const shown = sortedRows(table).filter((r) => rowMatches(table.rows[r], query))

  const focusCell = (r: number, c: number) => root.current?.querySelector<HTMLElement>(`[data-r="${r}"][data-c="${c}"]`)?.focus()
  useEffect(() => {
    if (pending.current) focusCell(pending.current.r, pending.current.c)
    pending.current = undefined
  }, [table])

  function addRow(at = table.rows.length) {
    update((t) => insertRow(t, at))
    pending.current = { r: at, c: 0 }
  }

  function sortBy(col: number, dir: 'asc' | 'desc') {
    update((t) => ({ ...t, sort: t.sort?.col === col && t.sort.dir === dir ? undefined : { col, dir } }))
  }

  /** Arrow keys and Tab move between cells in shown order; Tab in the last cell adds a row. */
  function onKeyDown(e: React.KeyboardEvent) {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-r]')
    if (!cell) return
    const editing = (e.target as HTMLElement).tagName === 'INPUT'
    const r = Number(cell.dataset.r)
    const c = Number(cell.dataset.c)
    const at = shown.indexOf(r)
    const go = (row: number | undefined, col: number) => {
      if (row === undefined) return
      e.preventDefault()
      focusCell(row, Math.max(0, Math.min(col, table.cols.length - 1)))
    }
    if (e.key === 'Tab') {
      if (!e.shiftKey && at === shown.length - 1 && c === table.cols.length - 1) {
        e.preventDefault()
        return addRow()
      }
      const flat = at * table.cols.length + c + (e.shiftKey ? -1 : 1)
      if (flat < 0 || flat >= shown.length * table.cols.length) return
      go(shown[Math.floor(flat / table.cols.length)], flat % table.cols.length)
    } else if (editing) return
    else if (e.key === 'ArrowDown') go(shown[at + 1], c)
    else if (e.key === 'ArrowUp') go(shown[at - 1], c)
    else if (e.key === 'ArrowRight') go(r, c + 1)
    else if (e.key === 'ArrowLeft') go(r, c - 1)
  }

  const columnMenu = (i: number): MenuGroup[] => {
    const col = table.cols[i]
    const kind = kindOf(col)
    const title = i === 0
    return [
      {
        items: [
          {
            label: 'Type',
            icon: iconOf(col),
            disabled: title,
            children: [{ items: TYPES.map((type) => ({ label: TYPE_INFO[type][0], icon: TYPE_INFO[type][1], checked: col.type === type, onSelect: () => update((t) => setColumnType(t, i, type)) })) }],
          },
          ...(kind === 'select' || kind === 'multi-select' ? [{ label: 'Options', icon: Palette, onSelect: () => setEditOptions(i) }] : []),
        ],
      },
      {
        items: [
          { label: 'Sort ascending', icon: ArrowUpNarrowWide, checked: table.sort?.col === i && table.sort.dir === 'asc', onSelect: () => sortBy(i, 'asc') },
          { label: 'Sort descending', icon: ArrowDownNarrowWide, checked: table.sort?.col === i && table.sort.dir === 'desc', onSelect: () => sortBy(i, 'desc') },
        ],
      },
      {
        items: [
          { label: 'Insert left', icon: ArrowLeftToLine, disabled: title, onSelect: () => update((t) => insertColumn(t, i)) },
          { label: 'Insert right', icon: ArrowRightToLine, onSelect: () => update((t) => insertColumn(t, i + 1)) },
          { label: 'Move left', icon: ArrowLeft, disabled: sorted || !canMove(table, i, -1), onSelect: () => update((t) => moveColumn(t, i, -1)) },
          { label: 'Move right', icon: ArrowRight, disabled: sorted || !canMove(table, i, 1), onSelect: () => update((t) => moveColumn(t, i, 1)) },
        ],
      },
      {
        items: [
          { label: 'Duplicate', icon: Copy, onSelect: () => update((t) => duplicateColumn(t, i)) },
          {
            label: 'Delete',
            icon: Trash2,
            danger: true,
            disabled: title,
            onSelect: () => (columnEmpty(table, i) ? update((t) => deleteColumn(t, i)) : setConfirmDelete(i)),
          },
        ],
      },
    ]
  }

  const rowMenu = (r: number): MenuGroup[] => [
    { items: [{ label: 'Expand record', icon: Maximize2, onSelect: () => setRecord(r) }] },
    {
      items: [
        { label: 'Insert above', icon: ArrowUp, disabled: sorted, onSelect: () => update((t) => insertRow(t, r)) },
        { label: 'Insert below', icon: ArrowDown, disabled: sorted, onSelect: () => update((t) => insertRow(t, r + 1)) },
        { label: 'Duplicate', icon: Copy, onSelect: () => update((t) => duplicateRow(t, r)) },
        { label: 'Delete', icon: Trash2, danger: true, onSelect: () => update((t) => deleteRow(t, r)) },
      ],
    },
  ]

  /** The ··· menu of the open view: its column (Kanban group by, Calendar date), Clear sort (Table), Delete view. */
  const viewMenu = (): MenuGroup[] => [
    ...(view.type === 'table'
      ? [{ items: [{ label: 'Clear sort', icon: X, disabled: !sorted, onSelect: () => update((t) => ({ ...t, sort: undefined })) }] }]
      : [
          {
            items: [
              {
                label: view.type === 'kanban' ? 'Group by' : 'Date column',
                icon: view.type === 'kanban' ? Columns3 : Calendar,
                children: [{ items: viewColumns(table, view.type).map((i) => ({ label: table.cols[i].name, icon: iconOf(table.cols[i]), checked: view.groupBy === i, onSelect: () => update((t) => setViewColumn(t, viewAt, i)) })) }],
              },
            ],
          },
        ]),
    { items: [{ label: 'Delete view', icon: Trash2, danger: true, disabled: views.length < 2, onSelect: () => { update((t) => deleteView(t, viewAt)); setViewIndex(0) } }] },
  ]

  const widthOf = (i: number) => (drag?.i === i ? drag.w : (table.cols[i].w ?? DEFAULT_COL_WIDTH))
  const smallButton = 'grid size-6 place-items-center rounded-md text-neutral-500 transition-colors duration-150 hover:bg-neutral-200 hover:text-neutral-900'

  return (
    <div ref={root} className="datatable group/table my-4 text-sm text-neutral-900" onKeyDown={readOnly ? undefined : onKeyDown}>
      <div className="group/title flex items-center gap-1">
        {readOnly ? (
          <h3 className="m-0 py-1 text-base font-semibold">{table.title}</h3>
        ) : (
          <CommitInput
            aria-label="Table title"
            value={table.title}
            placeholder="Untitled"
            className="h-8 min-w-0 flex-1 rounded-md bg-transparent px-1 text-base font-semibold outline-none hover:bg-neutral-50 focus:bg-neutral-50"
            onCommit={(title) => update((t) => ({ ...t, title: title || 'Untitled' }))}
          />
        )}
        {!readOnly && (
          <MenuButton label="Table actions" className={`${iconButton} print:hidden`} groups={[{ items: [{ label: 'Delete table', icon: Trash2, danger: true, onSelect: remove }] }]}>
            <MoreHorizontal size={16} />
          </MenuButton>
        )}
      </div>
      <div className="flex h-9 items-center gap-1 border-b border-neutral-200 print:hidden">
        <div role="tablist" aria-label="Views" className="flex items-center gap-1">
          {views.map((v, i) => {
            const Icon = VIEW_INFO[v.type][1]
            return (
              <button
                key={i}
                role="tab"
                aria-selected={i === viewAt}
                className={`-mb-px flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-1.5 transition-colors duration-150 ${i === viewAt ? 'border-neutral-900 font-medium text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-900'}`}
                onClick={() => setViewIndex(i)}
              >
                <Icon size={16} className="text-neutral-500" /> {label(i)}
              </button>
            )
          })}
          {!readOnly && (
            <MenuButton
              label="Add view"
              className={iconButton}
              groups={[
                {
                  items: (['table', 'kanban', 'calendar'] as const).map((type) => ({
                    label: VIEW_INFO[type][0] + (type !== 'table' && !viewColumns(table, type).length ? ` (needs a ${type === 'kanban' ? 'Select' : 'Date'} column)` : ''),
                    icon: VIEW_INFO[type][1],
                    disabled: type !== 'table' && !viewColumns(table, type).length,
                    onSelect: () => {
                      update((t) => addView(t, type))
                      setViewIndex(views.length)
                    },
                  })),
                },
              ]}
            >
              <Plus size={16} />
            </MenuButton>
          )}
        </div>
        <span className="flex-1" />
        {!readOnly && (
          <div className={`flex items-center gap-1.5 transition-opacity duration-150 ease-in group-hover/table:opacity-100 group-focus-within/table:opacity-100 has-[[aria-expanded=true]]:opacity-100 ${searching || query ? 'opacity-100' : 'opacity-0'}`}>
            {searching ? (
              <label className="flex h-7 items-center gap-1.5 rounded-md border border-neutral-300 px-2">
                <Search size={14} className="shrink-0 text-neutral-500" />
                <input
                  autoFocus
                  aria-label="Search rows"
                  placeholder="Search"
                  className="w-32 bg-transparent text-sm outline-none placeholder:text-neutral-500"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setQuery('')
                      setSearching(false)
                    }
                  }}
                  onBlur={() => !query && setSearching(false)}
                />
                {query && (
                  <button aria-label="Clear search" className="text-neutral-500 hover:text-neutral-900" onClick={() => setQuery('')}>
                    <X size={14} />
                  </button>
                )}
              </label>
            ) : (
              <button className={iconButton} title="Search" aria-label="Search rows" onClick={() => setSearching(true)}>
                <Search size={16} />
              </button>
            )}
            <MenuButton label="View options" className={iconButton} groups={viewMenu()}>
              <MoreHorizontal size={16} />
            </MenuButton>
            <button className="inline-flex items-center gap-1 rounded border border-neutral-200 px-2 py-1 text-sm leading-[22px] font-medium whitespace-nowrap text-neutral-900 transition-colors duration-200 hover:bg-neutral-100" onClick={() => addRow()}>
              <Plus size={16} className="text-neutral-500" /> New Record
            </button>
          </div>
        )}
      </div>
      {view.type === 'table' && (
      <div className="dt-scroll w-fit max-w-full overflow-x-auto border-t border-neutral-200 print:overflow-visible">
        <table role="grid" aria-label={table.title} className="border-separate border-spacing-0" style={{ tableLayout: 'fixed', width: (readOnly ? 0 : RAIL + ADD) + table.cols.reduce((n, _, i) => n + widthOf(i), 0) }}>
          <colgroup>
            {!readOnly && <col style={{ width: RAIL }} className="print:hidden" />}
            {table.cols.map((_, i) => (
              <col key={i} style={{ width: widthOf(i) }} />
            ))}
            {!readOnly && <col style={{ width: ADD }} className="print:hidden" />}
          </colgroup>
          <thead>
            <tr>
              {!readOnly && <th className={`${cellBorder} p-0 print:hidden`} />}
              {table.cols.map((col, i) => {
                const head = (
                  <>
                    <span className="text-neutral-500">
                      <TypeIcon col={col} />
                    </span>
                    <span className="truncate">{col.name}</span>
                    {table.sort?.col === i && (table.sort.dir === 'asc' ? <ArrowUp size={12} className="shrink-0" /> : <ArrowDown size={12} className="shrink-0" />)}
                  </>
                )
                return (
                  <th key={i} scope="col" className={`${cellBorder} relative p-0 text-left text-sm font-normal text-neutral-500`}>
                    {readOnly ? (
                      <span className="flex h-[34px] items-center gap-1.5 px-1.5">{head}</span>
                    ) : (
                      <>
                        <ColumnHeader label={`${col.name} column`} col={col} groups={columnMenu(i)} onRename={(name) => update((t) => renameColumn(t, i, name))}>
                          {head}
                        </ColumnHeader>
                        <ResizeHandle
                          name={col.name}
                          width={widthOf(i)}
                          onDrag={(w) => setDrag({ i, w })}
                          onDone={(w) => {
                            setDrag(undefined)
                            if (w !== (col.w ?? DEFAULT_COL_WIDTH)) update((t) => setColumnWidth(t, i, w))
                          }}
                        />
                      </>
                    )}
                  </th>
                )
              })}
              {!readOnly && (
                <th className="min-w-10 border-b border-neutral-200 p-0 print:hidden">
                  <button className="grid h-[34px] w-full place-items-center text-neutral-500 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900" title="Add column" aria-label="Add column" onClick={() => update((t) => insertColumn(t, t.cols.length))}>
                    <Plus size={16} />
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r} className="group/row transition-colors duration-150 hover:bg-neutral-50 starting:opacity-0 [transition-property:background-color,opacity]">
                {!readOnly && (
                  <td className={`${cellBorder} p-0 align-middle print:hidden`}>
                    <span className="grid place-items-center opacity-0 transition-opacity duration-150 group-focus-within/row:opacity-100 group-hover/row:opacity-100 has-[[aria-expanded=true]]:opacity-100">
                      <MenuButton label="Row actions" className={`${smallButton} cursor-grab`} groups={rowMenu(r)}>
                        <GripVertical size={14} />
                      </MenuButton>
                    </span>
                  </td>
                )}
                {table.cols.map((_, c) => (
                  <td key={c} className={`${cellBorder} relative p-0 align-top`}>
                    <Cell t={table} r={r} c={c} update={update} docPath={docPath} readOnly={readOnly} />
                    {c === 0 && !readOnly && (
                      <span className="absolute top-1 right-1 flex gap-0.5 rounded-md bg-white opacity-0 shadow-sm transition-opacity duration-150 group-focus-within/row:opacity-100 group-hover/row:opacity-100 has-[[aria-expanded=true]]:opacity-100 print:hidden">
                        <button className={smallButton} title="Expand record" aria-label="Expand record" onClick={() => setRecord(r)}>
                          <Maximize2 size={13} />
                        </button>
                        <MenuButton label="Row actions" className={smallButton} groups={rowMenu(r)}>
                          <MoreHorizontal size={14} />
                        </MenuButton>
                      </span>
                    )}
                  </td>
                ))}
                {!readOnly && <td className="border-b border-neutral-200 print:hidden" />}
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={table.cols.length + 2} className="h-[34px] border-b border-neutral-200 px-2 text-neutral-500">
                  {query ? `No rows match “${query}”` : 'No rows yet.'}
                </td>
              </tr>
            )}
            {!readOnly && (
              <tr className="print:hidden">
                <td colSpan={table.cols.length + 2} className="border-b border-neutral-200 p-0">
                  <button className="flex h-[34px] w-full items-center gap-1.5 px-2 text-left text-neutral-500 transition-colors duration-150 hover:bg-neutral-50 hover:text-neutral-900" onClick={() => addRow()}>
                    <Plus size={14} /> New Record
                  </button>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              {!readOnly && <td className="print:hidden" />}
              {table.cols.map((col, i) => {
                const value = summaryText(table, i)
                if (readOnly)
                  return (
                    <td key={i} className="h-[34px] px-2 text-right text-xs text-neutral-500">
                      {value}
                    </td>
                  )
                return (
                  <td key={i} className={`p-0 text-right ${value ? '' : 'print:invisible'}`}>
                    <MenuButton
                      label={`Calculate ${col.name}`}
                      className="h-[34px] w-full truncate px-2 text-right text-xs whitespace-nowrap text-neutral-500 opacity-100 transition-colors duration-150 hover:bg-neutral-50 hover:text-neutral-900"
                      groups={[
                        {
                          items: summariesFor(kindOf(col)).map((kind) => ({
                            label: SUMMARY_LABELS[kind],
                            checked: (col.summary ?? 'none') === kind,
                            onSelect: () => update((t) => ({ ...t, cols: t.cols.map((x, j) => (j === i ? { ...x, summary: kind === 'none' ? undefined : kind } : x)) })),
                          })),
                        },
                      ]}
                    >
                      {value ? <span className="font-medium text-neutral-700">{value}</span> : <span className="opacity-0 group-hover/table:opacity-100 hover:opacity-100 focus-visible:opacity-100">Calculate</span>}
                    </MenuButton>
                  </td>
                )
              })}
              {!readOnly && <td className="print:hidden" />}
            </tr>
          </tfoot>
        </table>
      </div>
      )}
      {view.type === 'calendar' && view.groupBy !== undefined && (
        <CalendarView t={table} col={view.groupBy} rows={shown} update={update} readOnly={readOnly} open={setRecord} />
      )}
      {view.type === 'kanban' && view.groupBy !== undefined && (
        <Kanban t={table} col={view.groupBy} rows={shown} update={update} readOnly={readOnly} open={setRecord} />
      )}
      {record !== undefined && table.rows[record] && (
        <Peek label="Record" onClose={() => setRecord(undefined)} buttons={[]}>
          <div className="mx-auto max-w-2xl px-10 pt-12 pb-16" onKeyDown={(e) => e.stopPropagation()}>
            <CommitInput
              aria-label="Title"
              value={table.rows[record][0]}
              placeholder="Untitled"
              readOnly={readOnly}
              className="mb-6 w-full bg-transparent text-[32px] leading-tight font-bold tracking-[-0.02em] outline-none placeholder:text-neutral-400"
              onCommit={(v) => update((t) => setCell(t, record, 0, v))}
            />
            <div className="space-y-1">
              {table.cols.slice(1).map((col, j) => {
                return (
                  <div key={j} className="flex min-h-9 items-start gap-2">
                    <div className="flex h-9 w-40 shrink-0 items-center gap-2 text-neutral-500">
                      <TypeIcon col={col} size={16} />
                      <span className="truncate">{col.name}</span>
                    </div>
                    <div className="min-w-0 flex-1 rounded-md hover:bg-neutral-50">
                      <Cell t={table} r={record} c={j + 1} update={update} docPath={docPath} readOnly={readOnly} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Peek>
      )}
      {confirmDelete !== undefined && (
        <Dialog aria-label="Delete column" onClose={() => setConfirmDelete(undefined)}>
          <h2 className="font-semibold">Delete the column “{table.cols[confirmDelete]?.name}”?</h2>
          <p className="mt-2 text-neutral-700">Its cells will be removed from the table.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button autoFocus className={ghostButton} onClick={() => setConfirmDelete(undefined)}>
              Cancel
            </button>
            <button
              className={dangerButton}
              onClick={() => {
                const i = confirmDelete
                setConfirmDelete(undefined)
                update((t) => deleteColumn(t, i))
              }}
            >
              Delete column
            </button>
          </div>
        </Dialog>
      )}
      {editOptions !== undefined && table.cols[editOptions] && <OptionsDialog col={table.cols[editOptions]} i={editOptions} update={update} onClose={() => setEditOptions(undefined)} />}
    </div>
  )
}

/** Kanban view: one column per option of Select column `col`; drag a card to another column to change its value. */
function Kanban({ t, col, rows, update, readOnly, open }: { t: Table; col: number; rows: number[]; update: Update; readOnly?: boolean; open: (r: number) => void }) {
  const [over, setOver] = useState<number>() // column the dragged card is over
  const groups = groupRows(t, col, rows)
  const others = t.cols.map((_, i) => i).filter((i) => i > 0 && i !== col)
  return (
    <div className="dt-scroll flex items-start gap-3 overflow-x-auto py-3 print:overflow-visible">
      {groups.map((g, gi) => (
        <section
          key={g.option?.n ?? ''}
          aria-label={g.option?.n ?? `No ${t.cols[col].name}`}
          className={`w-[260px] shrink-0 rounded-lg p-2 transition-colors duration-150 ${over === gi ? 'bg-accent-soft' : 'bg-neutral-50'}`}
          onDragOver={(e) => {
            if (readOnly) return
            e.preventDefault()
            setOver(gi)
          }}
          onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(undefined)}
          onDrop={(e) => {
            e.preventDefault()
            setOver(undefined)
            const r = Number(e.dataTransfer.getData('text/plain'))
            if (!readOnly && Number.isInteger(r) && t.rows[r] && t.rows[r][col].trim() !== (g.option?.n ?? '')) update((tt) => setCell(tt, r, col, g.option?.n ?? ''))
          }}
        >
          <header className="flex h-7 items-center gap-2 px-1">
            {g.option ? <Pill name={g.option.n} col={t.cols[col]} /> : <span className="text-xs font-medium text-neutral-500">No {t.cols[col].name}</span>}
            <span className="text-xs text-neutral-500 tabular-nums">{g.rows.length}</span>
            <span className="flex-1" />
            {!readOnly && (
              <button className={`${iconButton} size-6 print:hidden`} title="New record" aria-label={`New record in ${g.option?.n ?? 'no value'}`} onClick={() => update((tt) => insertRowWith(tt, { [col]: g.option?.n ?? '' }))}>
                <Plus size={14} />
              </button>
            )}
          </header>
          <ul className="mt-1 space-y-2">
            {g.rows.map((r) => {
              const shown = others.filter((i) => t.rows[r][i]?.trim() && fits(t.cols[i], t.rows[r][i])).slice(0, 3)
              return (
                <li key={r}>
                  <button
                    draggable={!readOnly}
                    className="block w-full cursor-pointer rounded-lg border border-neutral-200 bg-white p-2.5 text-left shadow-sm transition-colors duration-150 hover:bg-neutral-50 active:cursor-grabbing"
                    onClick={() => open(r)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(r))
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => setOver(undefined)}
                  >
                    <span className={`block truncate font-medium ${t.rows[r][0].trim() ? '' : 'text-neutral-500'}`}>{t.rows[r][0].trim() || 'Untitled'}</span>
                    {shown.map((i) => (
                      <span key={i} className="mt-1.5 flex items-center gap-1.5 text-xs text-neutral-700">
                        <TypeIcon col={t.cols[i]} size={12} />
                        <span className="min-w-0 flex-1 truncate">{cardText(t.cols[i], t.rows[r][i])}</span>
                      </span>
                    ))}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

const WEEKDAYS = Array.from({ length: 7 }, (_, d) => new Date(Date.UTC(2023, 0, 1 + d)).toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }))
const MAX_PER_DAY = 3

/** Calendar view: a month grid over Date column `col`; click a day to add a record dated that day. */
function CalendarView({ t, col, rows, update, readOnly, open }: { t: Table; col: number; rows: number[]; update: Update; readOnly?: boolean; open: (r: number) => void }) {
  const today = localDate()
  const [[year, month], setMonth] = useState(() => [Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1])
  const byDay = rowsByDate(t, col, rows)
  const shift = (n: number) =>
    setMonth(() => {
      const d = new Date(Date.UTC(year, month + n, 1))
      return [d.getUTCFullYear(), d.getUTCMonth()]
    })
  const title = new Date(Date.UTC(year, month, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const add = (day: string) => !readOnly && update((tt) => insertRowWith(tt, { [col]: day }))
  return (
    <div className="py-3">
      <div className="mb-2 flex items-center gap-1 print:hidden">
        <h4 className="mr-2 text-sm font-semibold">{title}</h4>
        <button className={iconButton} title="Previous month" aria-label="Previous month" onClick={() => shift(-1)}>
          <ChevronLeft size={16} />
        </button>
        <button className="h-7 rounded-md px-2 text-sm text-neutral-700 transition-colors duration-150 hover:bg-neutral-100" onClick={() => setMonth([Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1])}>
          Today
        </button>
        <button className={iconButton} title="Next month" aria-label="Next month" onClick={() => shift(1)}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div role="grid" aria-label={title} className="border-t border-neutral-200">
        <div role="row" className="grid grid-cols-7">
          {WEEKDAYS.map((d) => (
            <div key={d} role="columnheader" className="h-8 border-b border-neutral-200 px-2 text-xs leading-8 text-neutral-500">
              {d}
            </div>
          ))}
        </div>
        {monthGrid(year, month).map((week) => (
          <div key={week[0]} role="row" className="grid grid-cols-7">
            {week.map((day, i) => {
              const items = byDay.get(day) ?? []
              const inMonth = Number(day.slice(5, 7)) - 1 === month
              return (
                <div
                  key={day}
                  role="gridcell"
                  aria-label={day}
                  className={`group/day min-h-24 min-w-0 border-b border-neutral-200 p-1 ${i < 6 ? 'border-r' : ''} ${inMonth ? '' : 'bg-neutral-50'} ${readOnly ? '' : 'cursor-pointer'}`}
                  onClick={() => add(day)}
                >
                  <div className="flex h-6 items-center justify-between px-1">
                    <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-xs tabular-nums ${day === today ? 'bg-accent font-medium text-on-accent' : inMonth ? 'text-neutral-700' : 'text-neutral-400'}`}>{Number(day.slice(8))}</span>
                    {!readOnly && (
                      <button className="grid size-5 place-items-center rounded text-neutral-500 opacity-0 transition-opacity duration-150 group-hover/day:opacity-100 hover:bg-neutral-100 focus-visible:opacity-100 print:hidden" title="New record" aria-label={`New record on ${day}`} onClick={(e) => (e.stopPropagation(), add(day))}>
                        <Plus size={13} />
                      </button>
                    )}
                  </div>
                  <ul className="space-y-0.5">
                    {items.slice(0, MAX_PER_DAY).map((r) => (
                      <li key={r}>
                        <button className="block w-full truncate rounded bg-neutral-100 px-1.5 py-0.5 text-left text-xs transition-colors duration-150 hover:bg-neutral-200" onClick={(e) => (e.stopPropagation(), open(r))}>
                          {t.rows[r][0].trim() || 'Untitled'}
                        </button>
                      </li>
                    ))}
                    {items.length > MAX_PER_DAY && <li className="px-1.5 text-xs text-neutral-500">+{items.length - MAX_PER_DAY} more</li>}
                  </ul>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/** A cell's value as card text: page links as their titles, a checked box as its column name. */
const cardText = (col: Column, v: string) => {
  const kind = kindOf(col)
  return kind === 'page' ? pageLinks(v).map((l) => l.title).join(', ') : kind === 'checkbox' ? (isChecked(v) ? 'Checked' : 'Unchecked') : kind === 'progress' ? `${progressValue(v)}%` : v.trim()
}

/** An input that commits on Enter or blur (not on every keystroke), so the block is not rewritten while typing. */
function CommitInput({
  value,
  onCommit,
  onCancel,
  ref,
  ...rest
}: { value: string; onCommit: (v: string) => void; onCancel?: () => void; ref?: React.Ref<HTMLInputElement> } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [draft, setDraft] = useState(value)
  const [prev, setPrev] = useState(value)
  if (value !== prev) {
    setPrev(value)
    setDraft(value)
  }
  return (
    <input
      {...rest}
      ref={ref}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        if (draft !== value) onCommit(draft)
        rest.onBlur?.(e)
      }}
      onKeyDown={(e) => {
        rest.onKeyDown?.(e)
        if (e.defaultPrevented) return
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
          e.preventDefault()
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          setDraft(value)
          onCancel?.()
        }
      }}
    />
  )
}

/** Drag the header's right edge to resize (arrow keys too). Reports the live width while dragging, then the final one. */
function ResizeHandle({ name, width, onDrag, onDone }: { name: string; width: number; onDrag: (w: number) => void; onDone: (w: number) => void }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${name}`}
      tabIndex={0}
      className="absolute top-0 -right-[3px] z-10 h-full w-[6px] cursor-col-resize touch-none transition-colors duration-150 hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none"
      onPointerDown={(e) => {
        e.preventDefault()
        const el = e.currentTarget
        el.setPointerCapture(e.pointerId)
        const x0 = e.clientX
        let w = width
        const move = (ev: PointerEvent) => onDrag((w = Math.max(MIN_COL_WIDTH, Math.round(width + ev.clientX - x0))))
        const up = () => {
          el.removeEventListener('pointermove', move)
          el.removeEventListener('pointerup', up)
          el.removeEventListener('pointercancel', up)
          onDone(w)
        }
        el.addEventListener('pointermove', move)
        el.addEventListener('pointerup', up)
        el.addEventListener('pointercancel', up)
      }}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
        e.preventDefault()
        e.stopPropagation()
        onDone(Math.max(MIN_COL_WIDTH, width + (e.key === 'ArrowRight' ? 10 : -10)))
      }}
    />
  )
}

/** Header button that opens the column menu, with the name field at its top. */
function ColumnHeader({ label, col, groups, onRename, children }: { label: string; col: Column; groups: MenuGroup[]; onRename: (name: string) => void; children: ReactNode }) {
  const [anchor, setAnchor] = useState<DOMRect>()
  const button = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button
        ref={button}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        title={label}
        className="flex h-[34px] w-full items-center gap-1.5 px-1.5 text-left font-medium transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900"
        onClick={(e) => setAnchor(e.currentTarget.getBoundingClientRect())}
      >
        {children}
      </button>
      {anchor && (
        <Menu
          label={label}
          anchor={anchor}
          searchable={false}
          groups={groups}
          onClose={() => {
            setAnchor(undefined)
            if (document.activeElement === document.body) button.current?.focus()
          }}
          header={
            <div className="flex items-center gap-2 border-b border-neutral-200 p-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-neutral-100 text-neutral-500">
                <TypeIcon col={col} />
              </span>
              <CommitInput
                aria-label="Column name"
                value={col.name}
                className={`${input} h-7`}
                onCommit={onRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.stopPropagation() // rename, not pick the active item
                }}
              />
            </div>
          }
        />
      )}
    </>
  )
}

const pill = 'inline-flex max-w-full items-center truncate rounded-[4px] px-2 py-px text-xs font-medium text-neutral-900'
const pillStyle = (color = 'gray') => ({ background: `color-mix(in srgb, var(--icon-${color}) 22%, transparent)` })

function Pill({ name, col }: { name: string; col: Column }) {
  const option = col.options?.find((o) => o.n === name)
  return (
    <span className={pill} style={pillStyle(option?.c)}>
      {name}
    </span>
  )
}

/** Text with `[Title](page.md)` links shown as page chips. */
function LinkedText({ text, docPath }: { text: string; docPath: string }) {
  const parts: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(/\[([^\]]*)\]\(([^)\s]+)\)/g)) {
    parts.push(text.slice(last, m.index))
    const target = pageTarget(docPath, m[2])
    parts.push(target || m[2].endsWith('.md') ? <PageChip key={m.index} path={target} title={m[1]} /> : m[0])
    last = m.index! + m[0].length
  }
  parts.push(text.slice(last))
  return <>{parts}</>
}

type CellProps = { t: Table; r: number; c: number; update: Update; docPath: string; readOnly?: boolean }

/** One cell: shown by its column type; Enter or a click edits it. Text cells take `@` to link a page. */
function Cell({ t, r, c, update, docPath, readOnly }: CellProps) {
  const col = t.cols[c]
  const kind = c === 0 ? 'text' : kindOf(col)
  const value = t.rows[r][c] ?? ''
  const [editing, setEditing] = useState(false)
  const [picker, setPicker] = useState<DOMRect>() // @ page picker / Page column picker
  const [options, setOptions] = useState<DOMRect>() // select / multi-select menu
  const box = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const caret = useRef(0) // where the `@` was typed
  const set = (v: string) => update((tt) => setCell(tt, r, c, v))
  const misfit = !fits(col, value)

  function activate() {
    if (readOnly) return
    const at = box.current!.getBoundingClientRect()
    if (misfit && kind !== 'text' && kind !== 'link') return setEditing(true) // fix the text by hand
    if (kind === 'checkbox') set(isChecked(value) ? UNCHECKED : CHECKED)
    else if (kind === 'select' || kind === 'multi-select') setOptions(at)
    else if (kind === 'page') setPicker(at)
    else setEditing(true)
  }

  const base = `flex min-h-[34px] w-full items-center gap-1 px-2 py-1 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${readOnly ? '' : 'cursor-text'}`
  let shown: ReactNode
  if (misfit)
    shown = (
      <>
        <span className="truncate">{value}</span>
        <span title={`Does not fit the ${TYPE_INFO[kindOf(col)][0]} type`}>
          <AlertTriangle size={13} className="shrink-0 text-neutral-500" />
        </span>
      </>
    )
  else if (kind === 'number') shown = <span className="ml-auto tabular-nums">{value}</span>
  else if (kind === 'progress')
    shown = (
      <span className="flex w-full items-center gap-2">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressValue(value)}>
          <span className="block h-full rounded-full bg-accent" style={{ width: `${progressValue(value)}%` }} />
        </span>
        <span className="w-9 text-right text-xs text-neutral-700 tabular-nums">{progressValue(value)}%</span>
      </span>
    )
  else if (kind === 'checkbox')
    shown = (
      <input
        type="checkbox"
        tabIndex={-1}
        aria-label={col.name}
        disabled={readOnly}
        className="size-4 cursor-pointer accent-[var(--color-accent)]"
        checked={isChecked(value)}
        onChange={() => set(isChecked(value) ? UNCHECKED : CHECKED)}
        onClick={(e) => e.stopPropagation()}
      />
    )
  else if (kind === 'select') shown = value.trim() && <Pill name={value.trim()} col={col} />
  else if (kind === 'multi-select') shown = <span className="flex flex-wrap gap-1">{splitMulti(value).map((v) => <Pill key={v} name={v} col={col} />)}</span>
  else if (kind === 'date') shown = value && new Date(value + 'T00:00').toLocaleDateString(undefined, { dateStyle: 'medium' })
  else if (kind === 'link')
    shown = value && (
      <a href={value} target="_blank" rel="noreferrer" className="truncate text-accent underline underline-offset-2" onClick={(e) => e.stopPropagation()}>
        {value}
      </a>
    )
  else if (kind === 'page')
    shown = (
      <span className="flex flex-wrap gap-0.5">
        {pageLinks(value).map((l, i) => (
          <PageChip key={i} path={pageTarget(docPath, l.href)} title={l.title} />
        ))}
      </span>
    )
  else
    shown = (
      <span className="min-w-0 break-words">
        {c === 0 && <Type size={14} className="mr-1.5 inline shrink-0 align-[-2px] text-neutral-400" />}
        <LinkedText text={value} docPath={docPath} />
      </span>
    )

  const stop = () => {
    setEditing(false)
    requestAnimationFrame(() => box.current?.focus())
  }

  return (
    <div
      ref={box}
      role="gridcell"
      tabIndex={readOnly ? undefined : 0}
      data-r={r}
      data-c={c}
      aria-label={`${col.name}: ${value}`}
      className={base}
      onClick={() => !editing && activate()}
      onKeyDown={(e) => {
        if (editing || e.target !== e.currentTarget) return
        if (e.key === 'Enter') {
          e.preventDefault()
          activate()
        } else if ((e.key === 'Backspace' || e.key === 'Delete') && value && !readOnly) {
          e.preventDefault()
          set(kind === 'page' ? pageLinks(value).slice(0, -1).map((l) => `[${l.title}](${l.href})`).join(', ') : '')
        }
      }}
    >
      {editing ? (
        kind === 'date' && !misfit ? (
          <input
            autoFocus
            type="date"
            aria-label={col.name}
            className="h-6 w-full rounded bg-transparent text-sm outline-none [color-scheme:inherit]"
            defaultValue={validDate(value) ? value : ''}
            onBlur={(e) => {
              if (e.target.value !== value) set(e.target.value)
              setEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') stop()
            }}
          />
        ) : (
          <CommitInput
            ref={field}
            autoFocus
            aria-label={col.name}
            value={value}
            inputMode={kind === 'number' || kind === 'progress' ? 'decimal' : undefined}
            className={`h-6 w-full min-w-0 bg-transparent text-sm outline-none ${kind === 'number' || kind === 'progress' ? 'text-right' : ''}`}
            onCommit={kind === 'progress' ? (v) => set(clampProgress(v)) : set}
            onCancel={stop}
            onBlur={() => !picker && setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                e.currentTarget.blur()
                stop()
              }
            }}
            onInput={(e) => {
              const el = e.currentTarget
              const pos = el.selectionStart ?? 0
              // `@` at a word start opens the page picker (Title and Text cells).
              if ((kind === 'text' || c === 0) && el.value[pos - 1] === '@' && (pos === 1 || /\s/.test(el.value[pos - 2]))) {
                caret.current = pos
                setPicker(el.getBoundingClientRect())
              }
            }}
          />
        )
      ) : (
        shown
      )}
      {picker && (
        <PagePicker
          anchor={picker}
          exclude={[docPath]}
          onClose={() => {
            setPicker(undefined)
            if (editing) requestAnimationFrame(() => field.current?.focus())
          }}
          onPick={(path) => {
            const link = pageLink(docPath, path)
            if (kind === 'page') set(value.trim() ? `${value.trim()}, ${link}` : link)
            else {
              const draft = field.current?.value ?? value
              const at = caret.current
              set(draft.slice(0, at - 1) + link + draft.slice(at))
              setEditing(false)
            }
          }}
        />
      )}
      {options && (
        <OptionMenu
          anchor={options}
          col={col}
          multi={kind === 'multi-select'}
          value={value}
          onClose={() => {
            setOptions(undefined)
            requestAnimationFrame(() => box.current?.focus())
          }}
          onPick={(name, create) =>
            update((tt) => {
              const next = create ? addOption(tt, c, name) : tt
              const cur = next.rows[r][c]
              if (kind === 'select') return setCell(next, r, c, cur.trim() === name && !create ? '' : name)
              const list = splitMulti(cur)
              return setCell(next, r, c, joinMulti(list.includes(name) ? list.filter((x) => x !== name) : [...list, name]))
            })
          }
        />
      )}
    </div>
  )
}

/** Select and Multi-select picker: options with check marks, filtered by the field; "Create «x»" for a new name. */
function OptionMenu({ anchor, col, multi, value, onPick, onClose }: { anchor: DOMRect; col: Column; multi: boolean; value: string; onPick: (name: string, create: boolean) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const q = query.replace(/[,|]/g, '').trim()
  const chosen = multi ? splitMulti(value) : [value.trim()]
  const options = (col.options ?? []).filter((o) => o.n.toLowerCase().includes(q.toLowerCase()))
  const exact = col.options?.some((o) => o.n === q)
  return (
    <Menu
      label={col.name}
      anchor={anchor}
      searchable={false}
      onClose={onClose}
      header={
        <div className="border-b border-neutral-200 p-2">
          <input aria-label="Find or create an option" placeholder="Find or create an option" className={`${input} h-7`} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      }
      groups={[
        {
          items: [
            ...options.map((o) => ({
              label: o.n,
              leading: <span className="size-3 shrink-0 rounded-full" style={{ background: `var(--icon-${o.c})` }} />,
              checked: chosen.includes(o.n),
              onSelect: () => onPick(o.n, false),
            })),
            ...(q && !exact ? [{ label: `Create “${q}”`, icon: Plus, onSelect: () => onPick(q, true) }] : []),
          ],
        },
      ]}
    />
  )
}

/** Rename, recolor and remove a Select column's options. */
function OptionsDialog({ col, i, update, onClose }: { col: Column; i: number; update: Update; onClose: () => void }) {
  return (
    <Dialog aria-label={`${col.name} options`} onClose={onClose}>
      <h2 className="font-semibold">Options of “{col.name}”</h2>
      <ul className="mt-3 space-y-1">
        {(col.options ?? []).map((o) => (
          <li key={o.n} className="flex items-center gap-2">
            <MenuButton
              label={`Color of ${o.n}`}
              className="grid size-7 shrink-0 place-items-center rounded-md hover:bg-neutral-100"
              groups={[{ items: ICON_COLORS.map((c) => ({ label: c[0].toUpperCase() + c.slice(1), leading: <span className="size-3 rounded-full" style={{ background: `var(--icon-${c})` }} />, checked: o.c === c, onSelect: () => update((t) => recolorOption(t, i, o.n, c)) })) }]}
            >
              <span className="size-3.5 rounded-full" style={{ background: `var(--icon-${o.c})` }} />
            </MenuButton>
            <CommitInput aria-label={`Rename ${o.n}`} value={o.n} className={`${input} h-7`} onCommit={(name) => update((t) => renameOption(t, i, o.n, name))} />
            <button className={iconButton} title="Remove option" aria-label={`Remove ${o.n}`} onClick={() => update((t) => removeOption(t, i, o.n))}>
              <Trash2 size={15} />
            </button>
          </li>
        ))}
        {!col.options?.length && <li className="text-neutral-500">No options yet. Create one from a cell.</li>}
      </ul>
      <input
        aria-label="Add option"
        placeholder="Add option, then Enter"
        className={`${input} mt-3 h-7`}
        onKeyDown={(e) => {
          const name = e.currentTarget.value.trim()
          if (e.key === 'Enter' && name) {
            e.preventDefault()
            update((t) => addOption(t, i, name))
            e.currentTarget.value = ''
          }
        }}
      />
      <div className="mt-5 flex justify-end">
        <button autoFocus className={ghostButton} onClick={onClose}>
          Done
        </button>
      </div>
    </Dialog>
  )
}

/** Text of the code block that ends where the widget sits. */
const blockText = (view: EditorView, pos: number | undefined) => {
  const node = pos === undefined ? undefined : view.state.doc.resolve(pos).nodeBefore
  return node?.type.name === 'code_block' ? node.textContent : ''
}

export type LiveProps = { view: EditorView; getPos: () => number | undefined; docPath: string; subscribe: (cb: () => void) => () => void }

/** The table of the ```datatable block before the widget, re-read from the editor on every editor update. */
export function LiveTable({ view, getPos, docPath, subscribe }: LiveProps) {
  const text = useSyncExternalStore(subscribe, () => blockText(view, getPos()))
  return (
    <TableBlock
      text={text}
      docPath={docPath}
      readOnly={!view.editable}
      commit={(next) => {
        const pos = getPos()
        if (pos !== undefined && next !== blockText(view, pos)) setText(view, pos, next)
      }}
      remove={() => {
        const pos = getPos()
        const node = pos === undefined ? undefined : view.state.doc.resolve(pos).nodeBefore
        if (pos !== undefined && node) view.dispatch(view.state.tr.delete(pos - node.nodeSize, pos))
      }}
    />
  )
}
