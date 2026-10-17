import { movedPath, rewriteLinks } from './links'
import { parseIcon, type Entry } from './tree'

// Chromium-only File System Access bits missing from lib.dom.
declare global {
  function showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>
  interface FileSystemHandle {
    queryPermission(d: { mode: 'readwrite' }): Promise<PermissionState>
    requestPermission(d: { mode: 'readwrite' }): Promise<PermissionState>
  }
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

export const saveRoot = (dir: FileSystemDirectoryHandle) => idb((s) => s.put(dir, 'root'))
export const loadRoot = () => idb<FileSystemDirectoryHandle | undefined>((s) => s.get('root'))

export async function listEntries(dir: FileSystemDirectoryHandle, prefix = ''): Promise<Entry[]> {
  const out: Entry[] = []
  for await (const [name, handle] of dir.entries()) {
    if (name.startsWith('.')) continue // .git etc.
    const path = prefix ? `${prefix}/${name}` : name
    if (handle.kind === 'directory') {
      out.push({ path, kind: 'dir' }, ...(await listEntries(handle, path)))
    } else if (name.endsWith('.md') || name.endsWith('.excalidraw')) {
      // ponytail: reads every page on open; fine for personal-size folders, cache by lastModified if slow.
      out.push({ path, kind: 'file', icon: parseIcon(name, await (await handle.getFile()).text()) })
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

/** Folder at relative path `dir` ('' = root). */
async function dirAt(root: FileSystemDirectoryHandle, dir: string, create = false) {
  for (const part of dir.split('/').filter(Boolean)) root = await root.getDirectoryHandle(part, { create })
  return root
}

const splitPath = (path: string) => [path.slice(0, Math.max(path.lastIndexOf('/'), 0)), path.slice(path.lastIndexOf('/') + 1)]

export async function getFile(root: FileSystemDirectoryHandle, path: string) {
  const [dir, name] = splitPath(path)
  return (await dirAt(root, dir)).getFileHandle(name)
}

export async function writeFile(file: FileSystemFileHandle, data: string | Blob) {
  const w = await file.createWritable()
  await w.write(data)
  await w.close()
}

/** Writes an image to `assets/img-<id>.<ext>` and returns that root-relative path. */
export async function saveAsset(root: FileSystemDirectoryHandle, image: Blob) {
  const ext = image.type.split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg') || 'png'
  const name = `img-${crypto.randomUUID().slice(0, 8)}.${ext}`
  const assets = await root.getDirectoryHandle('assets', { create: true })
  await writeFile(await assets.getFileHandle(name, { create: true }), image)
  return `assets/${name}`
}

const EMPTY_BOARD = JSON.stringify(
  { type: 'excalidraw', version: 2, source: 'write-my-notes', elements: [], appState: {}, files: {} },
  null,
  2,
)

/** Creates `<dir>/<name>.<ext>`; `dir` is a relative folder path ('' = root). Returns the new file's path. */
export async function createPage(root: FileSystemDirectoryHandle, dir: string, name: string, type: 'doc' | 'board') {
  const folder = await dirAt(root, dir, true)
  const fileName = name + (type === 'doc' ? '.md' : '.excalidraw')
  const file = await folder.getFileHandle(fileName, { create: true })
  if (type === 'board' && (await file.getFile()).size === 0) await writeFile(file, EMPTY_BOARD)
  return dir ? `${dir}/${fileName}` : fileName
}

async function copyInto(handle: FileSystemHandle, dir: FileSystemDirectoryHandle, name: string) {
  if (handle instanceof FileSystemFileHandle) return writeFile(await dir.getFileHandle(name, { create: true }), await handle.getFile())
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

/** Moves page (or folder) `from` to `to` with its child folder, rewriting links to and from everything moved. */
export async function movePage(root: FileSystemDirectoryHandle, from: string, to: string) {
  const entries = await listEntries(root)
  const moved = entries.filter((e) => movedPath(e.path, from, to) !== e.path)
  // Case-insensitive: on Windows "a.md" -> "A.md" is the same file, and copy + delete would lose it.
  const taken = new Set(entries.map((e) => e.path.toLowerCase()))
  if (moved.some((e) => taken.has(movedPath(e.path, from, to).toLowerCase())) || movedPath(to, from, to) !== to) {
    throw new Error(`"${to}" already exists or is inside "${from}"`)
  }
  const texts: Record<string, string> = {}
  for (const e of entries)
    if (/\.(md|excalidraw)$/.test(e.path)) texts[e.path] = await (await (await getFile(root, e.path)).getFile()).text()
  const rewritten = rewriteLinks(texts, from, to)
  for (const e of moved) if (!moved.some((m) => e.path.startsWith(m.path + '/'))) await moveEntry(root, e.path, movedPath(e.path, from, to))
  for (const [path, text] of Object.entries(rewritten)) await writeFile(await getFile(root, path), text)
}
