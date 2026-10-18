import { invoke } from '@tauri-apps/api/core'
import { join } from '@tauri-apps/api/path'
import { open } from '@tauri-apps/plugin-dialog'
import { exists, mkdir, readDir, readFile, readTextFile, remove, rename, stat, writeFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { fileSearchTexts } from '@/features/search/boardText'
import { parseIcon, type Entry } from '@/features/sidebar/tree'
import { assetName, moveWithLinks, newPageContent, segments, splitPath, type Vault } from './fs'

const ROOT_KEY = 'write-my-notes:vault'

const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' }

/** Absolute path of relative `path` inside notes folder `root`. */
const abs = (root: string, path: string) => join(root, ...segments(path))

async function listEntries(root: string, dir = ''): Promise<Entry[]> {
  const out: Entry[] = []
  for (const { name, isDirectory } of await readDir(await abs(root, dir))) {
    if (name.startsWith('.')) continue // .git etc.
    const path = dir ? `${dir}/${name}` : name
    if (isDirectory) {
      out.push({ path, kind: 'dir' }, ...(await listEntries(root, path)))
    } else if (name.endsWith('.md') || name.endsWith('.excalidraw')) {
      const text = await readTextFile(await abs(root, path))
      out.push({ path, kind: 'file', icon: parseIcon(name, text), ...(name.endsWith('.md') ? { text } : { boardTexts: fileSearchTexts(text) }) })
    } else {
      out.push({ path, kind: 'file' })
    }
  }
  return out
}

/** `Vault` over a notes folder on disk, through `plugin-fs`. The folder is the only path the webview may touch. */
async function tauriVault(root: string): Promise<Vault> {
  await invoke('allow_vault', { path: root })
  const read = async (path: string) => readTextFile(await abs(root, path))
  const write = async (path: string, data: string | Blob) =>
    typeof data === 'string' ? writeTextFile(await abs(root, path), data) : writeFile(await abs(root, path), new Uint8Array(await data.arrayBuffer()))
  return {
    name: root.split(/[\\/]/).filter(Boolean).at(-1) ?? root,
    list: () => listEntries(root),
    read,
    readBlob: async (path) => new Blob([await readFile(await abs(root, path))], { type: MIME[path.split('.').at(-1)!.toLowerCase()] }),
    write,
    stat: async (path) => {
      const { mtime } = await stat(await abs(root, path))
      return mtime?.getTime() ?? 0
    },

    async saveAsset(image) {
      await mkdir(await abs(root, 'assets'), { recursive: true })
      const path = `assets/${assetName(image)}`
      await write(path, image)
      return path
    },

    async createPage(dir, name, type) {
      await mkdir(await abs(root, dir), { recursive: true })
      const path = (dir ? `${dir}/` : '') + name + (type === 'doc' ? '.md' : '.excalidraw')
      if (!(await exists(await abs(root, path)))) await write(path, newPageContent(type))
      return path
    },

    async move(from, to) {
      await moveWithLinks(await listEntries(root), from, to, {
        read,
        write,
        moveEntry: async (a, b) => {
          await mkdir(await abs(root, splitPath(b)[0]), { recursive: true })
          await rename(await abs(root, a), await abs(root, b))
        },
      })
    },

    async delete(paths) {
      for (const path of paths) {
        const file = await abs(root, path)
        if (await exists(file)) await remove(file, { recursive: true })
      }
    },
  }
}

/** The last folder, reopened without a prompt. Gone folders are forgotten. */
export async function restoreTauriVault() {
  const root = localStorage.getItem(ROOT_KEY)
  if (!root) return {}
  try {
    const vault = await tauriVault(root)
    await readDir(root) // a folder deleted since last time is forgotten, not opened
    return { vault }
  } catch {
    localStorage.removeItem(ROOT_KEY)
    return {}
  }
}

/** Native folder dialog; remembers the choice. Rejects with AbortError if the user cancels. */
export async function pickTauriVault() {
  const dir = await open({ directory: true, title: 'Open your notes folder' })
  if (!dir) throw Object.assign(new Error('cancelled'), { name: 'AbortError' })
  const vault = await tauriVault(dir)
  await vault.list() // fails here, not later, if the folder cannot be read
  localStorage.setItem(ROOT_KEY, dir)
  return vault
}
