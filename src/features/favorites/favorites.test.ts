import { expect, test } from 'vitest'
import { dropFavorites, loadFavorites, moveFavorites, saveFavorites, toggleFavorite } from './favorites'

test('toggle adds at the end, then removes', () => {
  expect(toggleFavorite(['a.md'], 'b.md')).toEqual(['a.md', 'b.md'])
  expect(toggleFavorite(['a.md', 'b.md'], 'a.md')).toEqual(['b.md'])
})

test('rename and move update the path, including a page inside a moved parent', () => {
  const favs = ['A.md', 'A/child.md', 'A/deep/leaf.md', 'B.md']
  expect(moveFavorites(favs, 'A.md', 'Z.md')).toEqual(['Z.md', 'Z/child.md', 'Z/deep/leaf.md', 'B.md'])
  expect(moveFavorites(favs, 'B.md', 'sub/B.md')).toEqual(['A.md', 'A/child.md', 'A/deep/leaf.md', 'sub/B.md'])
  expect(moveFavorites(['A/child.md'], 'A/child.md', 'child.md')).toEqual(['child.md'])
})

test('moving a page to the Trash removes it and the pages inside it', () => {
  const favs = ['A.md', 'A/child.md', 'AB.md', 'B.md']
  expect(dropFavorites(favs, ['A.md', 'A'])).toEqual(['AB.md', 'B.md']) // "AB.md" is not inside "A"
  expect(dropFavorites(favs, ['B.md', 'B'])).toEqual(['A.md', 'A/child.md', 'AB.md'])
})

test('stored per notes folder; bad data gives none', () => {
  const mem = new Map<string, string>()
  const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) }
  saveFavorites('C:\notes', ['a.md'], storage)
  expect(loadFavorites('C:\notes', storage)).toEqual(['a.md'])
  expect(loadFavorites('other', storage)).toEqual([])
  mem.set('write-my-notes:favorites:bad', '{oops')
  expect(loadFavorites('bad', storage)).toEqual([])
})
