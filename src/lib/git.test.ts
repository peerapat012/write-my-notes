import { expect, test } from 'vitest'
import { parseStatus } from './git'

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
