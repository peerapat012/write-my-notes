const FRONT = /^---\r?\n[\s\S]*?\r?\n---(\r?\n|$)/

/** Splits a doc into its raw front matter block (kept byte-for-byte) and the markdown body. */
export function splitFrontMatter(text: string) {
  const front = text.match(FRONT)?.[0] ?? ''
  return { front, body: text.slice(front.length) }
}

/**
 * Returns `front` with `icon:` (and `iconColor:` for a Lucide icon) set, in the place of the old ones or after the opening `---`.
 * No icon removes both keys, and the block itself if nothing else is left. Other keys stay untouched.
 */
export function setIcon(front: string, icon?: string, color?: string) {
  const lines = icon ? `icon: ${icon}\n` + (color ? `iconColor: ${color}\n` : '') : ''
  if (!front) return lines ? `---\n${lines}---\n` : ''
  let placed = false
  let out = front.replace(/^(icon|iconColor):.*(\r?\n|$)/gm, () => (placed ? '' : ((placed = true), lines)))
  if (!placed) out = out.replace(/^---\r?\n/, (open) => open + lines)
  return /^---\r?\n---(\r?\n|$)$/.test(out) ? '' : out
}

const TAGS = /^tags:.*(?:\r?\n[ \t]*-[ \t].*)*(?:\r?\n|$)/m
const unquote = (s: string) => s.trim().replace(/^(["'])(.*)\1$/, '$2')

/** Reads `created` and `tags` (flow `[a, b]` or block `- a` list) from a front matter block. */
export function getProps(front: string) {
  const created = front.match(/^created:[ \t]*(.+?)[ \t]*$/m)?.[1]
  const entry = front.match(TAGS)?.[0] ?? ''
  const flow = entry.match(/^tags:[ \t]*\[(.*)\]/)?.[1]
  const items = flow !== undefined ? flow.split(',') : [...entry.matchAll(/^[ \t]*-[ \t]+(.*)$/gm)].map((m) => m[1])
  return { created, tags: items.map(unquote).filter(Boolean) }
}

/** Returns `front` with `tags:` rewritten in flow style; an empty list removes the key. Other keys stay untouched. */
export function setTags(front: string, tags: string[]) {
  const line = tags.length ? `tags: [${tags.join(', ')}]\n` : ''
  if (!front) return line ? `---\n${line}---\n` : ''
  if (TAGS.test(front)) return front.replace(TAGS, line)
  return line ? front.replace(/\r?\n---(\r?\n|$)$/, (close) => `\n${line.trimEnd()}${close}`) : front
}
