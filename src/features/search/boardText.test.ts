import { expect, test } from 'vitest'
import { fileSearchTexts, searchTexts } from './boardText'

test('plain text keeps its own id', () => {
  expect(searchTexts([{ id: 't1', type: 'text', text: ' hello ' }])).toEqual([{ id: 't1', text: 'hello' }])
})

test('sticky bound text maps to its container', () => {
  const els = [
    { id: 'sticky', type: 'rectangle' },
    { id: 'label', type: 'text', text: 'buy milk', containerId: 'sticky' },
  ]
  expect(searchTexts(els)).toEqual([{ id: 'sticky', text: 'buy milk' }])
})

test('deleted elements, empty text and doc-card titles are skipped', () => {
  const els = [
    { id: 'a', type: 'text', text: 'gone', isDeleted: true },
    { id: 'b', type: 'text', text: '  ' },
    { id: 'card', type: 'rectangle', customData: { docPath: 'x.md' } },
    { id: 'title', type: 'text', text: 'x', containerId: 'card' },
    { id: 'dead', type: 'rectangle', isDeleted: true },
    { id: 'orphan', type: 'text', text: 'orphan', containerId: 'dead' },
  ]
  expect(searchTexts(els)).toEqual([])
})

test('file contents: parsed, and a broken file gives nothing', () => {
  expect(fileSearchTexts(JSON.stringify({ elements: [{ id: 'a', type: 'text', text: 'hi' }] }))).toEqual([{ id: 'a', text: 'hi' }])
  expect(fileSearchTexts('not json')).toEqual([])
})
