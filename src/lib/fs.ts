import { movedPath, rewriteLinks } from './links'
import { parseIcon, type Entry } from '@/features/sidebar/tree'

// Chromium-only File System Access bits missing from lib.dom.
declare global {
  function showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>
  interface FileSystemHandle {
    queryPermission(d: { mode: 'readwrite' }): Promise<PermissionState>
    requestPermission(d: { mode: 'readwrite' }): Promise<PermissionState>
  }
}

/** All file access goes through this. Paths are strings relative to the notes folder ('' = root). */
export interface Vault {
  name: string
  list(): Promise<Entry[]>
  read(path: string): Promise<string>
  readBlob(path: string): Promise<Blob>
  /** Overwrites an existing file. */
  write(path: string, data: string | Blob): Promise<void>
  /** `lastModified` of the file. */
  stat(path: string): Promise<number>
  /** Creates `<dir>/<name>.<ext>`; returns the new file's path. */
  createPage(dir: string, name: string, type: 'doc' | 'board'): Promise<string>
  /** Moves page (or folder) `from` to `to` with its child folder, rewriting links to and from everything moved. */
  move(from: string, to: string): Promise<void>
  /** Permanently removes files and folders (recursively). Paths that are already gone are skipped. */
  delete(paths: string[]): Promise<void>
  /** Writes an image to `assets/img-<id>.<ext>` and returns that root-relative path. */
  saveAsset(image: Blob): Promise<string>
}

function idb<T>(run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('write-my-notes', 1)
    open.onupgradeneeded = () => open.result.createObjectStore('kv')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const req = run(open.result.transaction('kv', 'readwrite').objectStore('kv'))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    }
  })
}

const saveRoot = (dir: FileSystemDirectoryHandle) => idb((s) => s.put(dir, 'root'))
const loadRoot = () => idb<FileSystemDirectoryHandle | undefined>((s) => s.get('root'))

export type Stored = { name: string; reopen: () => Promise<Vault | undefined> }

/** The folder saved by a previous session: `vault` if access is still granted, else `stored` (reopen needs a user gesture). */
export async function restoreVault(): Promise<{ vault?: Vault; stored?: Stored }> {
  const dir = await loadRoot()
  if (!dir) return {}
  if ((await dir.queryPermission({ mode: 'readwrite' })) === 'granted') return { vault: fsAccess(dir) }
  const reopen = async () => ((await dir.requestPermission({ mode: 'readwrite' })) === 'granted' ? fsAccess(dir) : undefined)
  return { stored: { name: dir.name, reopen } }
}

/** Folder picker; remembers the choice. Rejects with AbortError if the user cancels. */
export async function pickVault() {
  if (!('showDirectoryPicker' in window)) throw new Error('This browser cannot open folders. Use desktop Chrome or Edge on http://localhost.')
  const dir = await showDirectoryPicker({ mode: 'readwrite' })
  await saveRoot(dir)
  return fsAccess(dir)
}

async function listEntries(dir: FileSystemDirectoryHandle, prefix = ''): Promise<Entry[]> {
  const out: Entry[] = []
  for await (const [name, handle] of dir.entries()) {
    if (name.startsWith('.')) continue // .git etc.
    const path = prefix ? `${prefix}/${name}` : name
    if (handle.kind === 'directory') {
      out.push({ path, kind: 'dir' }, ...(await listEntries(handle, path)))
    } else if (name.endsWith('.md') || name.endsWith('.excalidraw')) {
      // ponytail: reads every page on open; fine for personal-size folders, cache by lastModified if slow.
      const text = await (await handle.getFile()).text()
      out.push({ path, kind: 'file', icon: parseIcon(name, text), text: name.endsWith('.md') ? text : undefined })
    } else {
      out.push({ path, kind: 'file' })
    }
  }
  return out
}

/** Paths of open docs and boards with edits not yet written to disk. Ticket 07 reads this. */
export const dirty = new Set<string>()

/** Open pages' flush: save pending edits now, resolve once written. Moves await these before reading files. */
export const flushes = new Set<() => Promise<void>>()

/** On window focus: what to do when an open file's `lastModified` differs from the one we last read or wrote. */
export const diskAction = (known: number, onDisk: number, isDirty: boolean) =>
  onDisk === known ? 'ignore' : isDirty ? 'ask' : 'reload'

/** Non-empty parts of a relative path: ignores leading, trailing and doubled slashes. */
export const segments = (path: string) => path.split('/').filter(Boolean)

/** Splits a relative path into its folder ('' = root) and file name. */
export function splitPath(path: string): [string, string] {
  const s = segments(path)
  return [s.slice(0, -1).join('/'), s.at(-1) ?? '']
}

/** Folder at relative path `dir` ('' = root). */
async function dirAt(root: FileSystemDirectoryHandle, dir: string, create = false) {
  for (const part of segments(dir)) root = await root.getDirectoryHandle(part, { create })
  return root
}

async function getFile(root: FileSystemDirectoryHandle, path: string) {
  const [dir, name] = splitPath(path)
  return (await dirAt(root, dir)).getFileHandle(name)
}

async function writeHandle(file: FileSystemFileHandle, data: string | Blob) {
  const w = await file.createWritable()
  await w.write(data)
  await w.close()
}

const EMPTY_BOARD = JSON.stringify(
  { type: 'excalidraw', version: 2, source: 'write-my-notes', elements: [], appState: {}, files: {} },
  null,
  2,
)

async function copyInto(handle: FileSystemHandle, dir: FileSystemDirectoryHandle, name: string) {
  if (handle instanceof FileSystemFileHandle) return writeHandle(await dir.getFileHandle(name, { create: true }), await handle.getFile())
  const to = await dir.getDirectoryHandle(name, { create: true })
  for await (const [n, h] of (handle as FileSystemDirectoryHandle).entries()) await copyInto(h, to, n)
}

// ponytail: copy + delete everywhere; FileSystemHandle.move() can't move directories on the local file system.
async function moveEntry(root: FileSystemDirectoryHandle, from: string, to: string) {
  const [fromDir, fromName] = splitPath(from)
  const [toDir, toName] = splitPath(to)
  const src = await dirAt(root, fromDir)
  const handle = await src.getFileHandle(fromName).catch(() => src.getDirectoryHandle(fromName))
  await copyInto(handle, await dirAt(root, toDir, true), toName)
  await src.removeEntry(fromName, { recursive: true })
}

/** `Vault` over a File System Access folder handle. */
export function fsAccess(root: FileSystemDirectoryHandle): Vault {
  const read = async (path: string) => (await (await getFile(root, path)).getFile()).text()
  const write = async (path: string, data: string | Blob) => writeHandle(await getFile(root, path), data)
  return {
    name: root.name,
    list: () => listEntries(root),
    read,
    readBlob: async (path) => (await getFile(root, path)).getFile(),
    write,
    stat: async (path) => (await (await getFile(root, path)).getFile()).lastModified,

    async saveAsset(image) {
      const ext = image.type.split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg') || 'png'
      const name = `img-${crypto.randomUUID().slice(0, 8)}.${ext}`
      const assets = await root.getDirectoryHandle('assets', { create: true })
      await writeHandle(await assets.getFileHandle(name, { create: true }), image)
      return `assets/${name}`
    },

    async createPage(dir, name, type) {
      const folder = await dirAt(root, dir, true)
      const fileName = name + (type === 'doc' ? '.md' : '.excalidraw')
      const file = await folder.getFileHandle(fileName, { create: true })
      if ((await file.getFile()).size === 0)
        await writeHandle(file, type === 'board' ? EMPTY_BOARD : `---
created: ${new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16)}
---
`)
      return dir ? `${dir}/${fileName}` : fileName
    },

    async move(from, to) {
      const entries = await listEntries(root)
      const moved = entries.filter((e) => movedPath(e.path, from, to) !== e.path)
      // Case-insensitive: on Windows "a.md" -> "A.md" is the same file, and copy + delete would lose it.
      const taken = new Set(entries.map((e) => e.path.toLowerCase()))
      if (moved.some((e) => taken.has(movedPath(e.path, from, to).toLowerCase())) || movedPath(to, from, to) !== to) {
        throw new Error(`"${to}" already exists or is inside "${from}"`)
      }
      const texts: Record<string, string> = {}
      for (const e of entries) if (/\.(md|excalidraw)$/.test(e.path)) texts[e.path] = await read(e.path)
      const rewritten = rewriteLinks(texts, from, to)
      for (const e of moved) if (!moved.some((m) => e.path.startsWith(m.path + '/'))) await moveEntry(root, e.path, movedPath(e.path, from, to))
      for (const [path, text] of Object.entries(rewritten)) await write(path, text)
    },

    async delete(paths) {
      for (const path of paths) {
        const [dir, name] = splitPath(path)
        try {
          await (await dirAt(root, dir)).removeEntry(name, { recursive: true })
        } catch (e) {
          if ((e as Error).name !== 'NotFoundError') throw e
        }
      }
    },
  }
}
