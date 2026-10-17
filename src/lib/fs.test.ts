import { expect, test } from 'vitest'
import { diskAction, segments, splitPath } from './fs'

test('external change: ignore same file, reload clean, ask dirty', () => {
  expect(diskAction(100, 100, false)).toBe('ignore')
  expect(diskAction(100, 100, true)).toBe('ignore') // own unsaved edits, disk untouched
  expect(diskAction(100, 200, false)).toBe('reload')
  expect(diskAction(100, 200, true)).toBe('ask')
})

test('relative path to segments: nested, assets/, stray slashes', () => {
  expect(segments('')).toEqual([])
  expect(segments('a/b/c.md')).toEqual(['a', 'b', 'c.md'])
  expect(segments('/a//b/')).toEqual(['a', 'b'])
  expect(splitPath('x.md')).toEqual(['', 'x.md'])
  expect(splitPath('a/b/c.md')).toEqual(['a/b', 'c.md'])
  expect(splitPath('assets/img-1.png')).toEqual(['assets', 'img-1.png'])
  expect(splitPath('/a/b.md/')).toEqual(['a', 'b.md'])
})
