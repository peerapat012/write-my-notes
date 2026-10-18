import { expect, test } from 'vitest'
import { originalPath, restoreTarget, topLevel, trashPath } from './trash'

test('trash path and back, nested', () => {
  expect(trashPath('A/B.md')).toBe('.trash/A/B.md')
  expect(originalPath(trashPath('A/B.md'))).toBe('A/B.md')
  expect(trashPath('x.excalidraw')).toBe('.trash/x.excalidraw')
})

test('topLevel hides pages inside a trashed page’s child folder', () => {
  expect(topLevel(['A/B.md', 'A/B/C.md', 'A/B/C/D.md', 'E.md', 'F/G.md'])).toEqual(['A/B.md', 'E.md', 'F/G.md'])
  expect(topLevel(['A/B/C.md'])).toEqual(['A/B/C.md']) // parent page not trashed: C is its own tree
})

test('restoreTarget adds (restored) when the page or its child folder is taken', () => {
  expect(restoreTarget('A.md', new Set())).toBe('A.md')
  expect(restoreTarget('A.md', new Set(['a.md']))).toBe('A (restored).md')
  expect(restoreTarget('d/A.md', new Set(['d/a']))).toBe('d/A (restored).md') // child folder taken
  expect(restoreTarget('A.md', new Set(['a.md', 'a (restored).md']))).toBe('A (restored) (restored).md')
})
