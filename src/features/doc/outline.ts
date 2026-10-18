import { splitFrontMatter } from './frontmatter'

export type Heading = { level: number; text: string }

/** ATX headings (H1–H6) of a markdown doc, in order. `#` lines inside fenced code blocks don't count. */
// ponytail: headings inside blockquotes or lists are skipped; the outline's click-to-scroll maps by index, so keep this in step with the editor DOM if that matters.
export function headings(markdown: string): Heading[] {
  const out: Heading[] = []
  let fence = ''
  for (const line of splitFrontMatter(markdown).body.split('\n')) {
    const f = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1]
    if (f) fence = !fence ? f : f[0] === fence[0] && f.length >= fence.length ? '' : fence
    else if (!fence) {
      const m = /^ {0,3}(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/.exec(line)
      if (m) out.push({ level: m[1].length, text: m[2].replace(/[*_~`]/g, '') })
    }
  }
  return out
}
