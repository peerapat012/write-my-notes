import { expect, test } from 'vitest'
import type { Entry } from '@/features/sidebar/tree'
import { linkTargets } from '@/lib/links'
import { backlinks } from './backlinks'

const page = (path: string, text: string): Entry => ({ path, kind: 'file', links: linkTargets(path, text) })

test('docs that link to a page, from any folder, by relative path', () => {
  const entries = [
    page('A.md', 'see [B](B.md)'),
    page('notes/deep/C.md', 'back to [B](../../B.md "title") and ![img](../../assets/x.png)'),
    page('D.md', 'no link, or [web](https://example.com/B.md) and [other](notes/E.md)'),
    page('B.md', 'self [B](B.md)'),
  ]
  expect(backlinks('B.md', entries)).toEqual(['A.md', 'notes/deep/C.md'])
})

test('boards: a doc card and an embedded image link count', () => {
  const entries = [page('boards/sketch.excalidraw', `{"x": {"docPath": "../B.md"}, "files": {"f": {"dataURL": "../assets/i.png"}}}`), page('X.md', 'x')]
  expect(backlinks('B.md', entries)).toEqual(['boards/sketch.excalidraw'])
  expect(backlinks('assets/i.png', entries)).toEqual(['boards/sketch.excalidraw'])
})

test('a doc that embeds a board', () => {
  expect(backlinks('draw.excalidraw', [page('A.md', '![board](draw.excalidraw)')])).toEqual(['A.md'])
})

test('trashed and template pages are left out', () => {
  const entries = [page('.trash/A.md', '[B](../B.md)'), page('.templates/T.md', '[B](../B.md)'), page('Real.md', '[B](B.md)')]
  expect(backlinks('B.md', entries)).toEqual(['Real.md'])
})
