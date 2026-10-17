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

/** On window focus: what to do when an open file's `lastModified` differs from the one we last read or wrote. */
export const diskAction = (known: number, onDisk: number, isDirty: boolean) =>
  onDisk === known ? 'ignore' : isDirty ? 'ask' : 'reload'

export async function getFile(root: FileSystemDirectoryHandle, path: string) {
  const parts = path.split('/')
  let dir = root
  for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part)
  return dir.getFileHandle(parts.at(-1)!)
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
  let folder = root
  for (const part of dir.split('/').filter(Boolean)) folder = await folder.getDirectoryHandle(part, { create: true })
  const fileName = name + (type === 'doc' ? '.md' : '.excalidraw')
  const file = await folder.getFileHandle(fileName, { create: true })
  if (type === 'board' && (await file.getFile()).size === 0) await writeFile(file, EMPTY_BOARD)
  return dir ? `${dir}/${fileName}` : fileName
}
