import { expect, test } from 'vitest'
import type { Entry } from '@/features/sidebar/tree'
import { buildRows, createdLabel, groupOf, relativeTime, sortRows } from './allPages'

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime()
const NOW = at(2026, 10, 18, 9)

test('groups by local day: today, yesterday, this week, older', () => {
  expect(groupOf(at(2026, 10, 18, 0), NOW)).toBe('Today')
  expect(groupOf(at(2026, 10, 17, 23), NOW)).toBe('Yesterday') // yesterday late evening, still a different day
  expect(groupOf(at(2026, 10, 12, 8), NOW)).toBe('This week')
  expect(groupOf(at(2026, 10, 11, 23), NOW)).toBe('Older')
  expect(groupOf(at(2026, 10, 18, 23), NOW)).toBe('Today') // clock a little ahead
})

const entries: Entry[] = [
  { path: 'b.md', kind: 'file', text: '---\ncreated: 2026-10-02T10:00\ntags: [x, y]\n---\n# Banana\n\nSome   body text', mtime: 300 },
  { path: 'A/a.md', kind: 'file', text: '---\ncreated: 2026-10-01T10:00\n---\nApple', mtime: 100 },
  { path: 'sketch.excalidraw', kind: 'file', boardTexts: [{ id: '1', text: 'hello' }, { id: '2', text: 'world' }], mtime: 200 },
  { path: '.trash/old.md', kind: 'file', text: 'gone', mtime: 999 },
  { path: '.templates/t.md', kind: 'file', text: 'tpl', mtime: 999 },
  { path: 'assets/img.png', kind: 'file', mtime: 5 },
  { path: 'A', kind: 'dir' },
]

test('rows: docs and boards only, with preview, tags and created', () => {
  const rows = buildRows(entries)
  expect(rows.map((r) => r.path)).toEqual(['b.md', 'A/a.md', 'sketch.excalidraw'])
  expect(rows[0]).toMatchObject({ title: 'b', type: 'doc', tags: ['x', 'y'], preview: 'Banana Some body text', created: '2026-10-02T10:00', updated: 300 })
  expect(rows[2]).toMatchObject({ title: 'sketch', type: 'board', preview: 'hello world' })
  expect(rows[2].created).toBeUndefined()
  expect(createdLabel(rows[2])).toBe('—')
  expect(createdLabel(rows[0])).not.toBe('—')
})

test('preview is cut at 100 characters', () => {
  const [row] = buildRows([{ path: 'long.md', kind: 'file', text: 'word '.repeat(60), mtime: 1 }])
  expect(row.preview).toHaveLength(101)
  expect(row.preview.endsWith('…')).toBe(true)
})

test('sorting by each column, both ways', () => {
  const rows = buildRows(entries)
  const paths = (key: Parameters<typeof sortRows>[1], dir: 'asc' | 'desc') => sortRows(rows, key, dir).map((r) => r.path)
  expect(paths('updated', 'desc')).toEqual(['b.md', 'sketch.excalidraw', 'A/a.md'])
  expect(paths('updated', 'asc')).toEqual(['A/a.md', 'sketch.excalidraw', 'b.md'])
  expect(paths('title', 'asc')).toEqual(['A/a.md', 'b.md', 'sketch.excalidraw'])
  expect(paths('title', 'desc')).toEqual(['sketch.excalidraw', 'b.md', 'A/a.md'])
  expect(paths('created', 'desc')).toEqual(['b.md', 'A/a.md', 'sketch.excalidraw']) // the board has none: last
  expect(paths('created', 'asc')).toEqual(['sketch.excalidraw', 'A/a.md', 'b.md'])
})

test('relativeTime: seconds, minutes, hours, days', () => {
  const now = 1_000_000_000_000
  expect(relativeTime(now - 10_000, now)).toBe('just now')
  expect(relativeTime(now - 120_000, now)).toBe('2 min ago')
  expect(relativeTime(now - 3 * 3600_000, now)).toBe('3 hr ago')
  expect(relativeTime(now - 86400_000, now)).toBe('yesterday')
  expect(relativeTime(now - 5 * 86400_000, now)).toBe('5 days ago')
})
