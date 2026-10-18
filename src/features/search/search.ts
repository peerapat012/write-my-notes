import { getProps, splitFrontMatter } from '@/features/doc/frontmatter'
import type { BoardText } from './boardText'

/** Search index: page path -> a doc's text, or a board's texts. */
export type SearchIndex = Map<string, string | BoardText[]>

/** `elementId`: the board element to zoom to. */
export type Hit = { path: string; title: string; snippet?: string; elementId?: string }

const titleOf = (path: string) => path.slice(path.lastIndexOf('/') + 1).replace(/\.(md|excalidraw)$/, '')

/** Title matches first (prefix before substring), then content matches with a snippet around the first hit. */
export function search(index: SearchIndex, query: string, limit = 50): Hit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  if (q.startsWith('#')) {
    const tag = q.slice(1)
    const byTag: Hit[] = []
    for (const [path, text] of index)
      if (typeof text === 'string' && path.endsWith('.md') && getProps(splitFrontMatter(text).front).tags.some((t) => t.toLowerCase().startsWith(tag))) byTag.push({ path, title: titleOf(path) })
    return byTag.sort((a, b) => a.title.localeCompare(b.title)).slice(0, limit)
  }
  const prefix: Hit[] = []
  const inTitle: Hit[] = []
  const inBody: Hit[] = []
  for (const [path, text] of index) {
    const title = titleOf(path)
    const t = title.toLowerCase()
    if (t.startsWith(q)) prefix.push({ path, title })
    else if (t.includes(q)) inTitle.push({ path, title })
    else {
      // A board hit is its first matching text, so one board is one row.
      const found = typeof text === 'string' ? { body: splitFrontMatter(text).body } : text.map((t) => ({ body: t.text, id: t.id })).find((t) => t.body.toLowerCase().includes(q))
      const at = found ? found.body.toLowerCase().indexOf(q) : -1
      if (!found || at < 0) continue
      const { body } = found
      const start = Math.max(0, at - 30)
      const end = at + q.length + 50
      const snippet = (start ? '…' : '') + body.slice(start, end).replace(/\s+/g, ' ').trim() + (end < body.length ? '…' : '')
      inBody.push({ path, title, snippet, ...('id' in found && { elementId: found.id }) })
    }
  }
  const byTitle = (a: Hit, b: Hit) => a.title.localeCompare(b.title)
  return [...prefix.sort(byTitle), ...inTitle.sort(byTitle), ...inBody].slice(0, limit)
}
