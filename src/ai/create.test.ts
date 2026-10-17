import { expect, test } from 'vitest'
import { flowSkeletons, outlineSkeletons, stickySkeletons, type Skeleton } from './create'

const box = (s: Skeleton) => ({ x: s.x as number, y: s.y as number, w: s.width as number, h: s.height as number })
const overlap = (a: Skeleton, b: Skeleton) => {
  const p = box(a)
  const q = box(b)
  return p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h
}

test('stickies: one per note, grid does not overlap', () => {
  const s = stickySkeletons(['a', 'b', 'c', 'd', 'e'], 0, 0)
  expect(s).toHaveLength(5)
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) expect(overlap(s[i], s[j])).toBe(false)
})

test('flow: layered top to bottom, arrows bound to nodes, no overlap', () => {
  const flow = {
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
      { id: 'd', label: 'D' },
    ],
    edges: [
      { from: 'a', to: 'b' },
      { from: 'a', to: 'c', label: 'x' },
      { from: 'b', to: 'd' },
      { from: 'a', to: 'ghost' }, // unknown node: dropped
    ],
  }
  const s = flowSkeletons(flow, 0, 0, 'p')
  const nodes = s.filter((e) => e.type === 'rectangle')
  const arrows = s.filter((e) => e.type === 'arrow')
  expect(nodes).toHaveLength(4)
  expect(arrows).toHaveLength(3)
  expect(arrows[0]).toMatchObject({ start: { id: 'p-a' }, end: { id: 'p-b' } })
  expect((nodes[1].y as number) > (nodes[0].y as number)).toBe(true)
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) expect(overlap(nodes[i], nodes[j])).toBe(false)
})

test('outline: title above bullet block', () => {
  const s = outlineSkeletons({ title: 'Plan', items: ['one', 'two'] }, 0, 0)
  expect(s).toHaveLength(2)
  expect(s[1].text).toBe('• one\n• two')
  expect((s[1].y as number) > (s[0].y as number)).toBe(true)
})

test('flow: a cycle does not hang', () => {
  const nodes = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]
  expect(flowSkeletons({ nodes, edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }] }, 0, 0)).toHaveLength(4)
})
