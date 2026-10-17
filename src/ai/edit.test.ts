import { expect, test } from 'vitest'
import { applyEdits, selectedTexts } from './edit'

const els = [
  { id: 'a', type: 'rectangle' },
  { id: 'at', type: 'text', text: 'hello', containerId: 'a', version: 1 },
  { id: 'b', type: 'text', text: 'world', version: 1 },
  { id: 'c', type: 'text', text: 'skip', version: 1 },
]

test('selectedTexts takes selected text and text bound to selected shapes', () => {
  expect(selectedTexts(els, { a: true, b: true })).toEqual([
    { id: 'at', text: 'hello' },
    { id: 'b', text: 'world' },
  ])
})

test('applyEdits changes only edited texts and bumps version', () => {
  const out = applyEdits(els, [
    { id: 'b', text: 'โลก' },
    { id: 'zzz', text: 'x' },
  ])
  expect(out[2]).toMatchObject({ id: 'b', text: 'โลก', originalText: 'โลก', version: 2 })
  expect(out[1]).toBe(els[1])
  expect(out).toHaveLength(4)
})
