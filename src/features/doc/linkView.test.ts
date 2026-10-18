import { expect, test } from 'vitest'
import { pageLink, pageTarget } from '@/lib/pages'
import { isCardLine } from './linkView'

test('a paragraph with only a link titled "card" is a card; the same link in a sentence is not', () => {
  expect(isCardLine('[Plan](../Plan.md "card")')).toBe(true)
  expect(isCardLine('See [Plan](../Plan.md "card") here')).toBe(false)
  expect(isCardLine('[Plan](../Plan.md)')).toBe(false)
})

test('page links: relative from nested folders, spaces encoded, card title, and back to a path', () => {
  expect(pageLink('Work/Q4/Notes.md', 'Plan.md')).toBe('[Plan](../../Plan.md)')
  expect(pageLink('Notes.md', 'Work/My plan.md', true)).toBe('[My plan](Work/My%20plan.md "card")')
  expect(pageLink('Work/Notes.md', 'Work/Board.excalidraw')).toBe('[Board](Board.excalidraw)')
  expect(pageTarget('Work/Q4/Notes.md', '../../Plan.md')).toBe('Plan.md')
  expect(pageTarget('Notes.md', 'Work/My%20plan.md')).toBe('Work/My plan.md')
  expect(pageTarget('Notes.md', 'https://example.com')).toBeUndefined()
  expect(pageTarget('Notes.md', 'assets/a.png')).toBeUndefined()
})
