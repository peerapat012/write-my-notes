/** `text`: a doc's contents, read at scan time for the search index. */
export type Entry = { path: string; kind: 'file' | 'dir'; icon?: string; text?: string }

export type TreeNode = {
  name: string
  path: string
  type: 'doc' | 'board' | 'folder'
  icon?: string
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

export function parseIcon(fileName: string, text: string): string | undefined {
  if (fileName.endsWith('.md')) {
    const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1]
    return front?.match(/^icon:\s*["']?(.+?)["']?\s*$/m)?.[1]
  }
  if (fileName.endsWith('.excalidraw')) {
    try {
      const icon = JSON.parse(text).icon
      return typeof icon === 'string' ? icon : undefined
    } catch {
      return undefined
    }
  }
}
