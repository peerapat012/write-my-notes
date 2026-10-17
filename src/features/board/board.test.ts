import { expect, test } from 'vitest'
import { cardText, exportElements, swapURLs, toDisk } from './board'

const scene = JSON.stringify({ type: 'excalidraw', version: 2, elements: [{ id: 'a' }] }, null, 2)

test('adds icon at top level and keeps the scene', () => {
  const out = JSON.parse(toDisk(scene, '🐳'))
  expect(out).toEqual({ type: 'excalidraw', version: 2, elements: [{ id: 'a' }], icon: '🐳' })
})

test('no icon leaves the scene untouched', () => {
  expect(toDisk(scene)).toBe(scene)
})

test('image round trip: data URL to assets path and back, fileIds kept', () => {
  const files = { f1: { id: 'f1', mimeType: 'image/png', dataURL: 'data:image/png;base64,AAAA', created: 1 } }
  const json = JSON.stringify({ type: 'excalidraw', elements: [{ id: 'img', type: 'image', fileId: 'f1' }], files })

  const disk = toDisk(json, undefined, { f1: '../assets/img-1.png' })
  expect(disk).not.toContain('data:')
  const saved = JSON.parse(disk)
  expect(saved.elements[0].fileId).toBe('f1')
  expect(saved.files.f1).toEqual({ ...files.f1, dataURL: '../assets/img-1.png' })

  expect(swapURLs(saved.files, { f1: 'data:image/png;base64,AAAA' })).toEqual(files)
})

test('doc card text: title, first lines without markdown', () => {
  const md = '---\nicon: 🐳\n---\n# Plan\n\n- [ ] Ship **it** see [docs](a.md)\n![](assets/img-1.png)\n```ts\nconst x = 1\n```\n> quote\nmore'
  expect(cardText('Notes/My Doc.md', md)).toBe('🐳 My Doc\nPlan\nShip it see docs\nconst x = 1')
  expect(cardText('A.md', '')).toBe('📄 A')
  expect(cardText('Gone.md')).toBe('⚠️ Gone\nBroken link: doc not found')
})

test('exportElements: selection with bound text, else every live element', () => {
  const els = [{ id: 'a' }, { id: 'at', containerId: 'a' }, { id: 'b' }, { id: 'c', isDeleted: true }]
  expect(exportElements(els, { a: true }).map((e) => e.id)).toEqual(['a', 'at'])
  expect(exportElements(els, {}).map((e) => e.id)).toEqual(['a', 'at', 'b'])
})
