import { expect, test } from 'vitest'
import { layout, parseChanges, parseGraph, parseRefs, type Commit } from './graph'

const c = (hash: string, ...parents: string[]): Commit => ({ hash, parents, author: '', date: '', refs: [], message: '' })

test('refs: HEAD pointer, remote branch, tag', () => {
  expect(parseRefs('HEAD -> main, origin/main, tag: v1')).toEqual([
    { name: 'HEAD', kind: 'head' },
    { name: 'main', kind: 'branch' },
    { name: 'origin/main', kind: 'branch' },
    { name: 'v1', kind: 'tag' },
  ])
  expect(parseRefs('')).toEqual([])
  expect(parseRefs('HEAD')).toEqual([{ name: 'HEAD', kind: 'head' }])
})

test('graph log lines become commits with parents', () => {
  const out = 'm1\x1fa1 b2\x1fAnn\x1f2026-10-01T10:00:00+07:00\x1fHEAD -> main\x1fMerge it\nroot\x1f\x1fBob\x1f2026-09-01T10:00:00+07:00\x1f\x1fFirst\n'
  expect(parseGraph(out)).toEqual([
    { hash: 'm1', parents: ['a1', 'b2'], author: 'Ann', date: '2026-10-01T10:00:00+07:00', refs: [{ name: 'HEAD', kind: 'head' }, { name: 'main', kind: 'branch' }], message: 'Merge it' },
    { hash: 'root', parents: [], author: 'Bob', date: '2026-09-01T10:00:00+07:00', refs: [], message: 'First' },
  ])
})

test('name-status lines, with a rename', () => {
  expect(parseChanges('M\ta.md\nR100\told.md\tnew.md\nA\t"\\340\\270\\201.md"\n')).toEqual([
    { status: 'M', path: 'a.md' },
    { status: 'R', from: 'old.md', path: 'new.md' },
    { status: 'A', path: 'ก.md' },
  ])
})

test('linear history stays in one lane', () => {
  const { rows, width } = layout([c('c', 'b'), c('b', 'a'), c('a')])
  expect(width).toBe(1)
  expect(rows.map((r) => [r.col, r.top, r.bottom])).toEqual([
    [0, false, true],
    [0, true, true],
    [0, true, false],
  ])
})

test('a branch and its merge use two lanes that join at the fork point', () => {
  // M merges C1 (main) and F1 (feature); both descend from B
  const { rows, width } = layout([c('M', 'C1', 'F1'), c('F1', 'B'), c('C1', 'B'), c('B')])
  expect(width).toBe(2)
  const [m, f1, c1, b] = rows
  expect(m).toMatchObject({ col: 0, forks: [1], top: false })
  expect(f1).toMatchObject({ col: 1, top: true, bottom: true, passing: [0] })
  expect(c1).toMatchObject({ col: 0, passing: [1] })
  expect(b).toMatchObject({ col: 0, joins: [1], bottom: false })
})
