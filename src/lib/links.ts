import { relativePath, resolvePath } from './paths'

const EXTERNAL = /^([a-z][a-z0-9+.-]*:|#|\/)/i
// ponytail: regex scan, so links inside code blocks get rewritten too; parse markdown if that bites.
const MD_LINK = /(\]\()(<[^>]*>|[^)\s]+)/g // [text](url "title"), ![alt](url), [text](<url with spaces>)
const BOARD_LINK = /("(?:dataURL|docPath)":\s*")([^"]*)/g // image files and doc cards in `.excalidraw` JSON

/** Root-relative target of link `url` in the file at `from`, or undefined for external/anchor links. */
export function linkTarget(from: string, url: string) {
  const file = url.split('#')[0]
  return EXTERNAL.test(url) || !file ? undefined : resolvePath(from, file)
}

/** Text of page `path` with each relative link replaced by `fn(target)` (undefined keeps it). */
function mapLinks(path: string, text: string, fn: (target: string) => string | undefined) {
  const board = path.endsWith('.excalidraw')
  return text.replace(board ? BOARD_LINK : MD_LINK, (all, pre: string, url: string) => {
    const angle = url.startsWith('<')
    const raw = angle ? url.slice(1, -1) : url
    const target = linkTarget(path, raw)
    const rel = target === undefined ? undefined : fn(target)
    if (rel === undefined) return all
    const hash = raw.includes('#') ? raw.slice(raw.indexOf('#')) : ''
    const out = angle || board ? rel : rel.replace(/ /g, '%20')
    return pre + (angle ? `<${out}${hash}>` : out + hash)
  })
}

const childDir = (p: string) => p.replace(/\.(md|excalidraw)$/, '')

/** Where `p` ends up when page (or folder) `from` moves to `to`; the page's child folder moves along. */
export function movedPath(p: string, from: string, to: string) {
  if (p === from) return to
  const dir = childDir(from)
  return p === dir || p.startsWith(dir + '/') ? childDir(to) + p.slice(dir.length) : p
}

/** New text of every page whose links change when `from` moves to `to`, keyed by the page's new path. */
export function rewriteLinks(files: Record<string, string>, from: string, to: string) {
  const out: Record<string, string> = {}
  for (const [path, text] of Object.entries(files)) {
    const at = movedPath(path, from, to)
    const next = mapLinks(path, text, (target) => {
      const dest = movedPath(target, from, to)
      return at === path && dest === target ? undefined : relativePath(at, dest)
    })
    if (next !== text) out[at] = next
  }
  return out
}

/** Root-relative targets of links in page `path` that are not in `exists`. */
export function brokenLinks(path: string, text: string, exists: Set<string>) {
  const out: string[] = []
  mapLinks(path, text, (target) => void (exists.has(target) || out.push(target)))
  return out
}

/** Root-relative targets of the relative links in page `path` (docs: links and images; boards: image files and doc cards). */
export function linkTargets(path: string, text: string) {
  const out = new Set<string>()
  mapLinks(path, text, (target) => void out.add(target))
  return [...out]
}
