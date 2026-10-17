import { expect, test } from 'vitest'
import { brokenLinks, movedPath, rewriteLinks } from './links'

test('rename in the same folder', () => {
  const files = { 'A.md': 'See [B](B.md) and [b](./B.md#top).', 'B.md': 'hi' }
  expect(rewriteLinks(files, 'B.md', 'C.md')).toEqual({ 'A.md': 'See [B](C.md) and [b](C.md#top).' })
})

test('move across folders, names with spaces', () => {
  const files = { 'X/A.md': '[o](<../My page.md>) [p](../My%20page.md)', 'My page.md': '' }
  expect(rewriteLinks(files, 'My page.md', 'Y/Z/My page.md')).toEqual({
    'X/A.md': '[o](<../Y/Z/My page.md>) [p](../Y/Z/My%20page.md)',
  })
})

test('moving a parent moves its children and fixes their relative links', () => {
  const files = {
    'P.md': '[kid](P/Kid.md)',
    'P/Kid.md': '![](../assets/img-1.png) [up](../P.md) [sib](Sib.md)',
    'P/Sib.md': '',
    'Q.md': '[kid](P/Kid.md)',
  }
  expect(rewriteLinks(files, 'P.md', 'Q/P.md')).toEqual({
    'Q/P/Kid.md': '![](../../assets/img-1.png) [up](../P.md) [sib](Sib.md)',
    'Q.md': '[kid](Q/P/Kid.md)',
  })
})

test('unrelated and external links stay untouched', () => {
  const text = '[a](Other.md) [w](https://x.dev/B.md) [h](#B) [r](./Other.md "t")'
  expect(rewriteLinks({ 'A.md': text }, 'B.md', 'C.md')).toEqual({})
})

test('boards: image files and doc cards', () => {
  const board = '{\n  "elements": [{ "customData": { "docPath": "Doc.md" } }],\n  "files": { "f": { "dataURL": "assets/img-1.png" }, "g": { "dataURL": "data:image/png;base64,x" } }\n}'
  expect(rewriteLinks({ 'Flow.excalidraw': board }, 'Flow.excalidraw', 'Sub/Flow.excalidraw')).toEqual({
    'Sub/Flow.excalidraw': board.replace('"Doc.md"', '"../Doc.md"').replace('"assets/', '"../assets/'),
  })
  expect(rewriteLinks({ 'Flow.excalidraw': board }, 'Doc.md', 'Docs/Doc.md')).toEqual({
    'Flow.excalidraw': board.replace('"Doc.md"', '"Docs/Doc.md"'),
  })
})

test('brokenLinks', () => {
  const exists = new Set(['A/B.md', 'assets/img-1.png'])
  expect(brokenLinks('A/C.md', '[b](B.md) [g](Gone.md) ![](../assets/img-1.png) [w](https://x.dev)', exists)).toEqual(['A/Gone.md'])
  expect(brokenLinks('F.excalidraw', '{"dataURL": "assets/img-2.png"}', exists)).toEqual(['assets/img-2.png'])
})

test('movedPath', () => {
  expect(movedPath('P', 'P.md', 'Q/R.md')).toBe('Q/R')
  expect(movedPath('P/a.png', 'P.md', 'Q/R.md')).toBe('Q/R/a.png')
  expect(movedPath('PX.md', 'P.md', 'Q/R.md')).toBe('PX.md')
  expect(movedPath('F/x.md', 'F', 'G/F')).toBe('G/F/x.md')
})
