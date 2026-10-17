import { expect, test } from 'vitest'
import { withIcon } from './board'

const scene = JSON.stringify({ type: 'excalidraw', version: 2, elements: [{ id: 'a' }] }, null, 2)

test('adds icon at top level and keeps the scene', () => {
  const out = JSON.parse(withIcon(scene, '🐳'))
  expect(out).toEqual({ type: 'excalidraw', version: 2, elements: [{ id: 'a' }], icon: '🐳' })
})

test('no icon leaves the scene untouched', () => {
  expect(withIcon(scene)).toBe(scene)
})
