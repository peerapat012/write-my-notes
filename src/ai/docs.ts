import { splitFrontMatter } from '@/features/doc/frontmatter'
import type { Skeleton } from './create'

export type DocInput = { title: string; text: string }

const LIMIT = 6000 // characters of one doc sent to the model

/** Prompt for generating board content from docs: each doc's text (no front matter), then the user's instruction. */
export function docsPrompt(prompt: string, docs: DocInput[]) {
  const sources = docs
    .map((d) => {
      const body = splitFrontMatter(d.text).body.trim()
      return `### ${d.title}\n${body.length > LIMIT ? body.slice(0, LIMIT) + '\n…' : body}`
    })
    .join('\n\n')
  const what = docs.length === 1 ? 'this document' : `these ${docs.length} documents`
  return `Using ${what} as the source:\n\n${sources}\n\n${prompt.trim() ? `Focus: ${prompt.trim()}` : 'Capture the main points.'}\n\nTopic:`
}

export type Box = { minX: number; minY: number; maxX: number; maxY: number }

/** Bounding box of elements with x, y, width, height. */
export const boundsOf = (els: { x: number; y: number; width: number; height: number }[]): Box => ({
  minX: Math.min(...els.map((e) => e.x)),
  minY: Math.min(...els.map((e) => e.y)),
  maxX: Math.max(...els.map((e) => e.x + e.width)),
  maxY: Math.max(...els.map((e) => e.y + e.height)),
})

/** Moves skeletons as one block so its left edge is `gap` right of `box` and its middle lines up with the box's middle. */
export function placeRight(skeletons: Skeleton[], box: Box, gap = 60): Skeleton[] {
  const num = (v: unknown) => (typeof v === 'number' ? v : 0)
  const own = boundsOf(skeletons.map((s) => ({ x: num(s.x), y: num(s.y), width: num(s.width), height: num(s.height) })))
  const dx = box.maxX + gap - own.minX
  const dy = (box.minY + box.maxY) / 2 - (own.minY + own.maxY) / 2
  return skeletons.map((s) => ({ ...s, x: num(s.x) + dx, y: num(s.y) + dy }))
}
