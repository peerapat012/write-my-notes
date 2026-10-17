const FRONT = /^---\r?\n[\s\S]*?\r?\n---(\r?\n|$)/

/** Splits a doc into its raw front matter block (kept byte-for-byte) and the markdown body. */
export function splitFrontMatter(text: string) {
  const front = text.match(FRONT)?.[0] ?? ''
  return { front, body: text.slice(front.length) }
}

/** Returns `front` with its `icon:` set, adding the line or the whole block if missing. */
export function setIcon(front: string, icon: string) {
  if (!front) return `---\nicon: ${icon}\n---\n`
  if (/^icon:.*$/m.test(front)) return front.replace(/^icon:.*$/m, `icon: ${icon}`)
  return front.replace(/^---\r?\n/, (open) => `${open}icon: ${icon}\n`)
}
