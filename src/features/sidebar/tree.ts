import type { BoardText } from '@/features/search/boardText'

/** `text`: a doc's contents, `boardTexts`: a board's texts; both read at scan time for the search index. */
export type Entry = { path: string; kind: 'file' | 'dir'; icon?: string; iconColor?: string; text?: string; boardTexts?: BoardText[] }

export type TreeNode = {
  name: string
  path: string
  type: 'doc' | 'board' | 'folder'
  icon?: string // an emoji, or `lucide:<name>`
  iconColor?: string
  children: TreeNode[]
}

const PAGE_EXT = { '.md': 'doc', '.excalidraw': 'board' } as const

function pageType(name: string) {
  for (const [ext, type] of Object.entries(PAGE_EXT)) {
    if (name.endsWith(ext)) return { type, base: name.slice(0, -ext.length) }
  }
}

const parentOf = (path: string) => path.slice(0, Math.max(path.lastIndexOf('/'), 0))
const nameOf = (path: string) => path.slice(path.lastIndexOf('/') + 1)
const join = (dir: string, name: string) => (dir ? `${dir}/${name}` : name)

export function buildTree(entries: Entry[]): TreeNode[] {
  const dirs = new Set(entries.filter((e) => e.kind === 'dir').map((e) => e.path))

  function level(dir: string): TreeNode[] {
    const here = entries.filter((e) => parentOf(e.path) === dir)
    const pages: TreeNode[] = []
    const claimed = new Set<string>()
    for (const e of here) {
      const page = e.kind === 'file' ? pageType(nameOf(e.path)) : undefined
      if (!page) continue
      const childDir = join(dir, page.base)
      claimed.add(childDir)
      pages.push({
        name: page.base,
        path: e.path,
        type: page.type,
        icon: e.icon,
        iconColor: e.iconColor,
        children: dirs.has(childDir) ? level(childDir) : [],
      })
    }
    const folders = here
      .filter((e) => e.kind === 'dir' && !claimed.has(e.path) && e.path !== 'assets')
      .map((e): TreeNode => ({ name: nameOf(e.path), path: e.path, type: 'folder', children: level(e.path) }))
    return [...folders, ...pages].sort((a, b) => a.name.localeCompare(b.name))
  }

  return level('')
}

/** `icon` or `iconColor` of a page: front matter key of a doc, top-level field of a board. */
function pageField(fileName: string, text: string, key: 'icon' | 'iconColor'): string | undefined {
  if (fileName.endsWith('.md')) {
    const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1]
    return front?.match(new RegExp(String.raw`^${key}:\s*["']?(.+?)["']?\s*$`, 'm'))?.[1]
  }
  if (fileName.endsWith('.excalidraw')) {
    try {
      const value = JSON.parse(text)[key]
      return typeof value === 'string' ? value : undefined
    } catch {
      return undefined
    }
  }
}

/** The page icon: an emoji, or `lucide:<name>`. */
export const parseIcon = (fileName: string, text: string) => pageField(fileName, text, 'icon')
export const parseIconColor = (fileName: string, text: string) => pageField(fileName, text, 'iconColor')

/** What deleting `node` removes: its file (or folder), a page's same-name child folder, and how many pages go with it. */
export function deletion(node: TreeNode) {
  const pages = (n: TreeNode): number => n.children.reduce((sum, c) => sum + (c.type === 'folder' ? 0 : 1) + pages(c), 0)
  const paths = node.type === 'folder' ? [node.path] : [node.path, node.path.replace(/\.(md|excalidraw)$/, '')]
  return { paths, childPages: pages(node) }
}
