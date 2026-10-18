import { expect, test } from 'vitest'
import { boundsOf, docsPrompt, placeRight } from './docs'

test('prompt with one doc: its text without front matter, and the instruction', () => {
  const p = docsPrompt('make a flow', [{ title: 'Meeting', text: '---\ncreated: 1\n---\n# Agenda\n- ship it' }])
  expect(p).toContain('this document')
  expect(p).toContain('### Meeting\n# Agenda\n- ship it')
  expect(p).not.toContain('created')
  expect(p).toContain('Focus: make a flow')
})

test('prompt with several docs lists each one', () => {
  const p = docsPrompt('', [
    { title: 'A', text: 'alpha' },
    { title: 'B', text: 'beta' },
  ])
  expect(p).toContain('these 2 documents')
  expect(p).toMatch(/### A\nalpha\n\n### B\nbeta/)
  expect(p).toContain('Capture the main points.')
})

test('a long doc is cut', () => {
  expect(docsPrompt('x', [{ title: 'L', text: 'a'.repeat(7000) }]).length).toBeLessThan(6300)
})

test('generated elements go to the right of the selected cards, centred on them', () => {
  const cards = [
    { x: 0, y: 0, width: 380, height: 300 },
    { x: 100, y: 400, width: 380, height: 300 },
  ]
  const box = boundsOf(cards)
  expect(box).toEqual({ minX: 0, minY: 0, maxX: 480, maxY: 700 })
  const placed = placeRight(
    [
      { type: 'rectangle', x: -500, y: 10, width: 180, height: 60 },
      { type: 'rectangle', x: -500, y: 150, width: 180, height: 60 },
      { type: 'text', x: -300, y: 40, text: 'no size' },
    ],
    box,
    60,
  )
  const out = boundsOf(placed.map((s) => ({ x: s.x as number, y: s.y as number, width: (s.width as number) ?? 0, height: (s.height as number) ?? 0 })))
  expect(out.minX).toBe(540) // 480 + 60: no overlap with either card
  expect((out.minY + out.maxY) / 2).toBe(350)
  expect(placed[0].type).toBe('rectangle')
})
