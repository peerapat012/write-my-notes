import { splitFrontMatter } from '@/features/doc/frontmatter'

/** Search index: page path -> its text. Boards map to '' so only their titles are searched (no board text, v2). */
export type SearchIndex = Map<string, string>

export type Hit = { path: string; title: string; snippet?: string }

const titleOf = (path: string) => path.slice(path.lastIndexOf('/') + 1).replace(/\.(md|excalidraw)$/, '')

/** Title matches first (prefix before substring), then content matches with a snippet around the first hit. */
export function search(index: SearchIndex, query: string, limit = 50): Hit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const prefix: Hit[] = []
  const inTitle: Hit[] = []
  const inBody: Hit[] = []
  for (const [path, text] of index) {
    const title = titleOf(path)
    const t = title.toLowerCase()
    if (t.startsWith(q)) prefix.push({ path, title })
    else if (t.includes(q)) inTitle.push({ path, title })
    else {
      const body = splitFrontMatter(text).body
      const at = body.toLowerCase().indexOf(q)
      if (at < 0) continue
      const start = Math.max(0, at - 30)
      const end = at + q.length + 50
      const snippet = (start ? '…' : '') + body.slice(start, end).replace(/\s+/g, ' ').trim() + (end < body.length ? '…' : '')
      inBody.push({ path, title, snippet })
    }
  }
  const byTitle = (a: Hit, b: Hit) => a.title.localeCompare(b.title)
  return [...prefix.sort(byTitle), ...inTitle.sort(byTitle), ...inBody].slice(0, limit)
}
