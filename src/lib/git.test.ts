import { expect, test } from 'vitest'
import { autoMessage, parseStatus, parseVersions, setupStep } from './git'

test('modified, added, deleted and untracked files', () => {
  const out = ' M notes/a.md\nA  b.md\n D gone.md\n?? new page.md\n?? assets/\n'
  expect(parseStatus(out)).toEqual([
    { status: ' M', path: 'notes/a.md' },
    { status: 'A ', path: 'b.md' },
    { status: ' D', path: 'gone.md' },
    { status: '??', path: 'new page.md' },
    { status: '??', path: 'assets/' },
  ])
})

test('a rename is one change with its old path', () => {
  expect(parseStatus('R  old.md -> sub/new.md\n')).toEqual([{ status: 'R ', from: 'old.md', path: 'sub/new.md' }])
})

test('quoted paths: quotes and utf-8 octal escapes are decoded', () => {
  expect(parseStatus('?? "a \\"b\\".md"\n?? "\\340\\270\\201.md"\n')).toEqual([
    { status: '??', path: 'a "b".md' },
    { status: '??', path: 'ก.md' },
  ])
})

test('clean tree and blank lines give nothing', () => {
  expect(parseStatus('')).toEqual([])
  expect(parseStatus('\n')).toEqual([])
})

test('auto message counts changed files', () => {
  expect(autoMessage(2)).toBe('Edited 2 pages')
  expect(autoMessage(1)).toBe('Edited 1 page')
})

test('versions carry the file path at each commit, across a rename', () => {
  const out =
    '\x1eccc\x1fAnn\x1f2026-10-03T10:00:00+07:00\x1fAfter rename\n\nM\tnew.md\n' +
    '\x1ebbb\x1fAnn\x1f2026-10-02T10:00:00+07:00\x1fRename\n\nR100\told.md\tnew.md\n' +
    '\x1eaaa\x1fBob\x1f2026-10-01T10:00:00+07:00\x1fFirst\n\nA\t"\\340\\270\\201.md"\n'
  expect(parseVersions(out, 'new.md')).toEqual([
    { hash: 'ccc', author: 'Ann', date: '2026-10-03T10:00:00+07:00', message: 'After rename', path: 'new.md' },
    { hash: 'bbb', author: 'Ann', date: '2026-10-02T10:00:00+07:00', message: 'Rename', path: 'new.md' },
    { hash: 'aaa', author: 'Bob', date: '2026-10-01T10:00:00+07:00', message: 'First', path: 'ก.md' },
  ])
  expect(parseVersions('', 'a.md')).toEqual([])
})

test('setup step: first thing still missing', () => {
  expect(setupStep(false, false, false)).toBe('git')
  expect(setupStep(true, false, false)).toBe('init')
  expect(setupStep(true, true, false)).toBe('remote')
  expect(setupStep(true, true, true)).toBe('done')
})
