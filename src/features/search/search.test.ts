import { expect, test } from 'vitest'
import { search, type SearchIndex } from './search'

const paths = (index: SearchIndex, q: string) => search(index, q).map((h) => h.path)

test('add, update, remove', () => {
  const index: SearchIndex = new Map()
  index.set('a.md', 'hello world')
  expect(paths(index, 'world')).toEqual(['a.md'])
  index.set('a.md', 'goodbye')
  expect(paths(index, 'world')).toEqual([])
  expect(paths(index, 'GOODBYE')).toEqual(['a.md'])
  index.delete('a.md')
  expect(paths(index, 'goodbye')).toEqual([])
})

test('ranks title prefix, then title substring, then content with snippet', () => {
  const index: SearchIndex = new Map([
    ['notes/body.md', '---\nicon: 🍎\n---\nI like apple pie'],
    ['notes/pineapple.md', ''],
    ['Apple ideas.excalidraw', ''],
    ['other.md', 'nothing here'],
  ])
  const hits = search(index, 'apple')
  expect(hits.map((h) => h.path)).toEqual(['Apple ideas.excalidraw', 'notes/pineapple.md', 'notes/body.md'])
  expect(hits[2]).toEqual({ path: 'notes/body.md', title: 'body', snippet: 'I like apple pie' })
})

test('ignores front matter, board text, and empty queries', () => {
  const index: SearchIndex = new Map([['a.md', '---\nicon: x\n---\nbody']])
  expect(paths(index, 'icon')).toEqual([])
  expect(paths(index, '  ')).toEqual([])
})

test('board text: hit carries the element to zoom to, title matches still rank first', () => {
  const index: SearchIndex = new Map([
    ['Plan.excalidraw', [{ id: 's1', text: 'ship the beta' }, { id: 's2', text: 'beta notes' }]],
    ['beta.excalidraw', [{ id: 'x', text: 'nothing' }]],
  ])
  const hits = search(index, 'beta')
  expect(hits.map((h) => h.path)).toEqual(['beta.excalidraw', 'Plan.excalidraw'])
  expect(hits[1]).toEqual({ path: 'Plan.excalidraw', title: 'Plan', snippet: 'ship the beta', elementId: 's1' })
})

test('board text: updated on save, removed on delete', () => {
  const index: SearchIndex = new Map([['b.excalidraw', [{ id: 'a', text: 'old word' }]]])
  expect(paths(index, 'old')).toEqual(['b.excalidraw'])
  index.set('b.excalidraw', [{ id: 'a', text: 'new word' }])
  expect(paths(index, 'old')).toEqual([])
  expect(paths(index, 'new')).toEqual(['b.excalidraw'])
  index.delete('b.excalidraw')
  expect(paths(index, 'new')).toEqual([])
})

test('#tag matches page tags', () => {
  const index: SearchIndex = new Map([
    ['a.md', '---\ntags: [journal, idea]\n---\nx'],
    ['b.md', '---\ntags:\n  - Journal\n---\nx'],
    ['c.md', '---\ntags: [other]\n---\njournal'],
  ])
  expect(paths(index, '#journal')).toEqual(['a.md', 'b.md'])
})
