import { expect, test } from 'vitest'
import { backlinks } from './backlinks'
import { linkTargets, rewriteLinks } from '@/lib/links'
import {
  addOption,
  columnName,
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
  moveColumn,
  NEW_TABLE,
  pageCell,
  pageLinks,
  parseTable,
  removeOption,
  renameColumn,
  renameOption,
  serializeTable,
  setCell,
  setColumnType,
  setColumnWidth,
  MIN_COL_WIDTH,
  sortedRows,
  splitMulti,
  summaryText,
  validDate,
  validNumber,
  type Table,
} from './datatable'

const SPRINT = `@schema {"title":"Sprint","types":["select","date","checkbox","page"],"options":{"1":[{"n":"Not started","c":"gray"},{"n":"Done","c":"green"}]},"sort":{"col":2,"dir":"asc"},"summary":{"1":"empty%"}}
| Title | Status | Due | Done | Related |
|---|---|---|---|---|
| Write the spec | Done | 2026-10-20 | [x] | [Plan](../Plan.md) |
| Review | Not started |  | [ ] |  |`

test('parse: schema, columns, rows, sort and summary', () => {
  const t = parseTable(SPRINT)
  expect(t.title).toBe('Sprint')
  expect(t.cols.map((c) => [c.name, c.type])).toEqual([
    ['Title', 'title'],
    ['Status', 'select'],
    ['Due', 'date'],
    ['Done', 'checkbox'],
    ['Related', 'page'],
  ])
  expect(t.cols[1].options).toHaveLength(2)
  expect(t.cols[1].summary).toBe('empty%')
  expect(t.sort).toEqual({ col: 2, dir: 'asc' })
  expect(t.rows[1]).toEqual(['Review', 'Not started', '', '[ ]', ''])
})

test('round trip keeps the block text', () => {
  expect(serializeTable(parseTable(SPRINT))).toBe(SPRINT.replace(/\|---\|---\|---\|---\|---\|/, '|---|---|---|---|---|'))
  expect(parseTable(serializeTable(parseTable(SPRINT)))).toEqual(parseTable(SPRINT))
  expect(parseTable(NEW_TABLE).cols.map((c) => c.name)).toEqual(['Title', 'Column', 'Column 2'])
  expect(parseTable(NEW_TABLE).rows).toEqual([['', '', ''], ['', '', '']])
})

test('pipes in cells are escaped, line breaks become spaces', () => {
  const t = setCell(parseTable(NEW_TABLE), 0, 1, 'a | b\nc')
  const text = serializeTable(t)
  expect(text).toContain('a \\| b c')
  expect(parseTable(text).rows[0][1]).toBe('a | b c')
})

test('missing or broken schema: every column is Text, the table still shows', () => {
  for (const head of ['', '@schema {broken']) {
    const t = parseTable(`${head}\n| Title | A |\n|---|---|\n| x | y |`)
    expect(t.cols.map(kindOf)).toEqual(['text', 'text'])
    expect(t.rows).toEqual([['x', 'y']])
    expect(serializeTable(t)).toMatch(/^@schema \{/)
  }
})

test('unknown type works as Text and is kept as written', () => {
  const t = parseTable('@schema {"types":["rollup"]}\n| Title | R |\n|---|---|\n| x | 1 |')
  expect(kindOf(t.cols[1])).toBe('text')
  expect(serializeTable(t)).toContain('"types":["rollup"]')
})

const base = (): Table => parseTable(NEW_TABLE)

test('columns: add, rename, insert, move, duplicate, delete', () => {
  let t = base()
  expect(columnName(t)).toBe('Column 3')
  t = insertColumn(t, 1)
  expect(t.cols.map((c) => c.name)).toEqual(['Title', 'Column 3', 'Column', 'Column 2'])
  t = insertColumn(t, 0) // never left of Title
  expect(t.cols[1].name).toBe('Column 4')
  t = renameColumn(t, 1, 'Owner')
  t = setCell(t, 0, 1, 'Ann')
  t = moveColumn(t, 1, 1)
  expect(t.cols.map((c) => c.name)).toEqual(['Title', 'Column 3', 'Owner', 'Column', 'Column 2'])
  expect(t.rows[0][2]).toBe('Ann')
  expect(moveColumn(t, 1, -1)).toBe(t) // next to Title
  t = duplicateColumn(t, 2)
  expect(t.cols[3].name).toBe('Owner copy')
  expect(t.rows[0][3]).toBe('Ann')
  t = deleteColumn(t, 2)
  expect(t.cols.map((c) => c.name)).toEqual(['Title', 'Column 3', 'Owner copy', 'Column', 'Column 2'])
  expect(deleteColumn(t, 0)).toBe(t)
})

test('sort follows its column through moves and deletes', () => {
  let t: Table = { ...base(), sort: { col: 2, dir: 'asc' } }
  t = moveColumn(t, 2, -1)
  expect(t.sort).toEqual({ col: 1, dir: 'asc' })
  t = insertColumn(t, 1)
  expect(t.sort?.col).toBe(2)
  expect(deleteColumn(t, 2).sort).toBeUndefined()
})

test('change type keeps the text; select gets options from the values', () => {
  let t = setCell(setCell(base(), 0, 1, 'abc'), 1, 1, 'Done')
  const num = setColumnType(t, 1, 'number')
  expect(num.rows.map((r) => r[1])).toEqual(['abc', 'Done'])
  expect(fits(num.cols[1], 'abc')).toBe(false)
  t = setColumnType(t, 1, 'select')
  expect(t.cols[1].options?.map((o) => o.n)).toEqual(['abc', 'Done'])
  expect(setColumnType(t, 0, 'number')).toBe(t) // Title is not retyped
})

test('rows: add, insert above/below, duplicate, delete', () => {
  let t = setCell(base(), 0, 0, 'A')
  t = insertRow(t, 0)
  expect(t.rows.map((r) => r[0])).toEqual(['', 'A', ''])
  t = duplicateRow(t, 1)
  expect(t.rows.map((r) => r[0])).toEqual(['', 'A', 'A', ''])
  t = insertRow(t, t.rows.length)
  expect(t.rows).toHaveLength(5)
  t = deleteRow(t, 0)
  expect(t.rows.map((r) => r[0])).toEqual(['A', 'A', '', ''])
})

test('options: next color, rename and remove update the cells', () => {
  let t = setColumnType(base(), 1, 'multi-select')
  t = addOption(t, 1, 'Red, team|x')
  t = addOption(t, 1, 'Blue')
  expect(t.cols[1].options).toEqual([
    { n: 'Red teamx', c: 'gray' },
    { n: 'Blue', c: 'red' },
  ])
  t = setCell(t, 0, 1, 'Red teamx, Blue')
  t = renameOption(t, 1, 'Blue', 'Navy')
  expect(t.rows[0][1]).toBe('Red teamx, Navy')
  t = removeOption(t, 1, 'Red teamx')
  expect(t.rows[0][1]).toBe('Navy')
  expect(t.cols[1].options?.map((o) => o.n)).toEqual(['Navy'])
})

test('cell values: checkbox, date, number, multi-select', () => {
  expect(isChecked('[x]')).toBe(true)
  expect(isChecked('[ ]')).toBe(false)
  expect(validDate('2026-10-20')).toBe(true)
  expect(validDate('2026-02-30')).toBe(false)
  expect(validDate('20/10/2026')).toBe(false)
  expect(validNumber('3.5')).toBe(true)
  expect(validNumber('abc')).toBe(false)
  expect(splitMulti(' a, b ,,c')).toEqual(['a', 'b', 'c'])
  expect(joinMulti(['a', 'b'])).toBe('a, b')
})

test('sort: text, number, date, empty last in both directions', () => {
  const t = parseTable('@schema {"types":["number","date"]}\n| Title | N | D |\n|---|---|---|\n| b | 10 | 2026-01-02 |\n| a | 9 |  |\n|  | 100 | 2025-12-31 |')
  expect(sortedRows({ ...t, sort: { col: 0, dir: 'asc' } })).toEqual([1, 0, 2])
  expect(sortedRows({ ...t, sort: { col: 0, dir: 'desc' } })).toEqual([0, 1, 2])
  expect(sortedRows({ ...t, sort: { col: 1, dir: 'asc' } })).toEqual([1, 0, 2])
  expect(sortedRows({ ...t, sort: { col: 2, dir: 'desc' } })).toEqual([0, 2, 1])
  expect(sortedRows(t)).toEqual([0, 1, 2])
})

test('summary: empty %, sum, average, checked', () => {
  const t = parseTable('@schema {"types":["number","checkbox"],"summary":{"0":"empty%","1":"sum","2":"checked%"}}\n| Title | N | C |\n|---|---|---|\n| a | 1 | [x] |\n| b | 2 | [ ] |\n|  | x | [ ] |')
  expect(summaryText(t, 0)).toBe('EMPTY 33.33%')
  expect(summaryText(t, 1)).toBe('SUM 3')
  expect(summaryText({ ...t, cols: t.cols.map((c, i) => (i === 1 ? { ...c, summary: 'avg' } : c)) }, 1)).toBe('AVERAGE 1.5')
  expect(summaryText(t, 2)).toBe('CHECKED 33.33%')
})

test('page links in cells: out, and through rename and backlinks', () => {
  expect(pageLinks('[Plan](../Plan.md), [B c](B%20c.md)')).toEqual([
    { title: 'Plan', href: '../Plan.md' },
    { title: 'B c', href: 'B%20c.md' },
  ])
  expect(pageCell([{ title: 'P[1]', href: 'P.md' }])).toBe('[P1](P.md)')
  const doc = '```datatable\n' + SPRINT + '\n```\n'
  expect(linkTargets('Work/Sprint.md', doc)).toEqual(['Plan.md'])
  const moved = rewriteLinks({ 'Work/Sprint.md': doc }, 'Plan.md', 'Archive/Plan.md')
  expect(moved['Work/Sprint.md']).toContain('[Plan](../Archive/Plan.md)')
  expect(backlinks('Plan.md', [{ path: 'Work/Sprint.md', kind: 'file', links: linkTargets('Work/Sprint.md', doc) }])).toEqual(['Work/Sprint.md'])
})

test('column width `w`: round trip, missing, invalid ignored, clamped', () => {
  const t = parseTable('@schema {"types":["text","text"],"w":{"0":240,"2":150}}\n| Title | A | B |\n|---|---|---|\n| x | y | z |')
  expect(t.cols.map((c) => c.w)).toEqual([240, undefined, 150])
  expect(parseTable(serializeTable(t))).toEqual(t)
  expect(serializeTable(t)).toContain('"w":{"0":240,"2":150}')
  // missing w: nothing written
  expect(serializeTable(parseTable(SPRINT))).not.toContain('"w"')
  // invalid values are ignored
  const bad = parseTable('@schema {"w":{"0":"wide","1":-5,"2":null,"3":99}}\n| Title | A | B | C |\n|---|---|---|---|')
  expect(bad.cols.map((c) => c.w)).toEqual([undefined, undefined, undefined, undefined])
  expect(setColumnWidth(t, 1, 40).cols[1].w).toBe(MIN_COL_WIDTH)
  expect(setColumnWidth(t, 1, 300.4).cols[1].w).toBe(300)
  // a column keeps its width when moved
  expect(moveColumn(t, 1, 1).cols[2].w).toBeUndefined()
  expect(moveColumn(t, 1, 1).cols[1].w).toBe(150)
})
