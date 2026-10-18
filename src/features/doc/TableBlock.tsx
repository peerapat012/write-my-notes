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
  CircleChevronDown,
  Copy,
  FileText,
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
import { ICON_COLORS } from '@/lib/icons'
import { pageLink, pageTarget } from '@/lib/pages'
import {
  addOption,
  canMove,
  CHECKED,
  columnEmpty,
  DEFAULT_COL_WIDTH,
  deleteColumn,
  deleteRow,
  duplicateColumn,
  duplicateRow,
  fits,
  insertColumn,
  insertRow,
  isChecked,
  joinMulti,
  kindOf,
  MIN_COL_WIDTH,
  moveColumn,
  pageLinks,
  parseTable,
  recolorOption,
  removeOption,
  renameColumn,
  renameOption,
  rowMatches,
  serializeTable,
  setCell,
  setColumnType,
  setColumnWidth,
  sortedRows,
  splitMulti,
  SUMMARY_LABELS,
  summariesFor,
  summaryText,
  TYPES,
  UNCHECKED,
  validDate,
  type ColType,
  type Column,
  type Table,
} from './datatable'

const TYPE_INFO: Record<ColType, [string, LucideIcon]> = {
  text: ['Text', Type],
  number: ['Number', Hash],
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
  const [drag, setDrag] = useState<{ i: number; w: number }>() // column being resized, and its live width
  const root = useRef<HTMLDivElement>(null)
  const sorted = !!table.sort
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
        <span role="tab" aria-selected className="-mb-px flex h-9 items-center gap-1.5 border-b-2 border-neutral-900 px-1 font-medium">
          <Table2 size={16} className="text-neutral-500" /> Table View
        </span>
        <span className="flex-1" />
        {!readOnly && (
          <>
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
            <MenuButton label="View options" className={iconButton} groups={[{ items: [{ label: 'Clear sort', icon: X, disabled: !sorted, onSelect: () => update((t) => ({ ...t, sort: undefined })) }] }]}>
              <MoreHorizontal size={16} />
            </MenuButton>
            <button className="ml-1 inline-flex h-7 items-center gap-1 rounded-md bg-accent px-2.5 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-accent/90" onClick={() => addRow()}>
              <Plus size={14} /> New Record
            </button>
          </>
        )}
      </div>
      <div className="dt-scroll w-fit max-w-full overflow-x-auto rounded-lg border border-neutral-200 print:overflow-visible">
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
              {!readOnly && <th className={`${cellBorder} bg-neutral-50 p-0 print:hidden`} />}
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
                  <th key={i} scope="col" className={`${cellBorder} relative bg-neutral-50 p-0 text-left text-sm font-medium text-neutral-700`}>
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
                <th className="min-w-10 border-b border-neutral-200 bg-neutral-50 p-0 print:hidden">
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

const pill = 'inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs font-medium text-neutral-900'
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
            inputMode={kind === 'number' ? 'decimal' : undefined}
            className={`h-6 w-full min-w-0 bg-transparent text-sm outline-none ${kind === 'number' ? 'text-right' : ''}`}
            onCommit={set}
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
