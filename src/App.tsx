import { FileText, Folder, Pencil, Plus, Presentation } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import BoardPage from './BoardPage'
import DocPage from './DocPage'
import { createPage, flushes, listEntries, loadRoot, movePage, saveRoot } from './fs'
import { movedPath } from './links'
import NameInput from './NameInput'
import SearchPalette from './SearchPalette'
import type { SearchIndex } from './search'
import { buildTree, type Entry, type TreeNode } from './tree'

const pageUrl = (path: string) => '/page/' + path.split('/').map(encodeURIComponent).join('/')
const currentPage = () =>
  location.pathname.startsWith('/page/') ? decodeURIComponent(location.pathname.slice('/page/'.length)) : null
const parentOf = (path: string) => path.slice(0, Math.max(path.lastIndexOf('/'), 0))
const join = (dir: string, name: string) => (dir ? `${dir}/${name}` : name)
const ext = (path: string) => path.match(/\.(md|excalidraw)$/)?.[0] ?? ''

type Move = (from: string, to: string) => void

export default function App() {
  const [root, setRoot] = useState<FileSystemDirectoryHandle>()
  const [stored, setStored] = useState<FileSystemDirectoryHandle>()
  const [entries, setEntries] = useState<Entry[]>([])
  const tree = useMemo(() => buildTree(entries), [entries])
  const exists = useMemo(() => new Set(entries.map((e) => e.path)), [entries])
  // Rebuilt on every scan (open, focus rescan, move) and doc save.
  const index = useMemo<SearchIndex>(
    () => new Map(entries.filter((e) => /\.(md|excalidraw)$/.test(e.path)).map((e) => [e.path, e.text ?? ''])),
    [entries],
  )
  const [page, setPage] = useState(currentPage)
  const [rev, setRev] = useState(0) // bumped after a move so the open page re-reads from disk

  async function open(dir: FileSystemDirectoryHandle) {
    setRoot(dir)
    setEntries(await listEntries(dir))
  }

  useEffect(() => {
    loadRoot().then(async (dir) => {
      if (!dir) return
      if ((await dir.queryPermission({ mode: 'readwrite' })) === 'granted') open(dir)
      else setStored(dir) // requestPermission needs a user gesture: show a reopen button
    })
    const onPop = () => setPage(currentPage())
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  // Rescan on focus to catch pages added or removed on disk (e.g. by `git pull`).
  useEffect(() => {
    if (!root) return
    const onFocus = () => listEntries(root).then(setEntries)
    addEventListener('focus', onFocus)
    return () => removeEventListener('focus', onFocus)
  }, [root])

  async function pickFolder() {
    if (!('showDirectoryPicker' in window)) {
      return alert('This browser cannot open folders. Use desktop Chrome or Edge on http://localhost.')
    }
    try {
      const dir = await showDirectoryPicker({ mode: 'readwrite' })
      await saveRoot(dir)
      await open(dir)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') alert(`Could not open folder: ${e}`)
    }
  }

  async function reopen() {
    if (stored && (await stored.requestPermission({ mode: 'readwrite' })) === 'granted') open(stored)
  }

  function go(path: string) {
    history.pushState(null, '', pageUrl(path))
    setPage(path)
  }

  async function move(from: string, to: string) {
    if (!root || from === to) return
    try {
      await Promise.all([...flushes].map((f) => f()))
      await movePage(root, from, to)
    } catch (e) {
      alert(`Could not move: ${e}`)
      return open(root)
    }
    await open(root)
    const next = page && movedPath(page, from, to)
    if (next !== page) history.replaceState(null, '', pageUrl(next!))
    setPage(next)
    setRev((r) => r + 1)
  }

  const rename = (from: string, name: string) => move(from, join(parentOf(from), name + ext(from)))

  async function create(dir: string, type: 'doc' | 'board') {
    const name = prompt(`New ${type} name`)?.trim()
    if (!root || !name) return
    const path = await createPage(root, dir, name, type)
    await open(root)
    go(path)
  }

  return (
    <div className="flex h-screen text-sm">
      <aside className="flex w-64 shrink-0 flex-col gap-2 overflow-auto border-r border-neutral-200 p-2">
        {stored && !root && (
          <button className="rounded px-2 py-1 text-left hover:bg-neutral-100" onClick={reopen}>
            Reopen “{stored.name}”
          </button>
        )}
        <button className="rounded px-2 py-1 text-left hover:bg-neutral-100" onClick={pickFolder}>
          Open folder…
        </button>
        {root && (
          <>
            <div
              className="flex items-center justify-between rounded px-2 font-medium"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => drop(e, '', move)}
            >
              {root.name}
              <AddMenu onAdd={(type) => create('', type)} />
            </div>
            <Tree nodes={tree} page={page} go={go} create={create} move={move} />
          </>
        )}
      </aside>
      <main className="min-w-0 flex-1 overflow-auto">
        {root && page?.endsWith('.md') ? (
          <DocPage
            key={page + rev}
            root={root}
            path={page}
            exists={exists}
            go={go}
            onRename={(name) => rename(page, name)}
            onIconChange={() => open(root)}
            onSave={(text) => setEntries((es) => es.map((e) => (e.path === page ? { ...e, text } : e)))}
          />
        ) : root && page?.endsWith('.excalidraw') ? (
          <BoardPage key={page + rev} root={root} path={page} go={go} onRename={(name) => rename(page, name)} />
        ) : (
          <div className="p-8 text-neutral-500">{page ?? 'No page selected'}</div>
        )}
      </main>
      {root && <SearchPalette index={index} go={go} />}
    </div>
  )
}

type TreeProps = {
  nodes: TreeNode[]
  page: string | null
  go: (path: string) => void
  create: (dir: string, type: 'doc' | 'board') => void
  move: Move
}

/** Drop handler: moves the dragged page or folder into folder `dir`. */
function drop(e: React.DragEvent, dir: string, move: Move) {
  e.preventDefault()
  e.stopPropagation()
  const from = e.dataTransfer.getData('text/x-page')
  if (from && parentOf(from) !== dir) move(from, join(dir, from.slice(from.lastIndexOf('/') + 1)))
}

function Tree({ nodes, ...props }: TreeProps) {
  return (
    <ul className="pl-3">
      {nodes.map((n) => (
        <li key={n.path}>
          <Node node={n} {...props} />
        </li>
      ))}
    </ul>
  )
}

function Node({ node, ...props }: { node: TreeNode } & Omit<TreeProps, 'nodes'>) {
  const { page, go, create, move } = props
  const [editing, setEditing] = useState(false)
  const isPage = node.type !== 'folder'
  const childDir = isPage ? node.path.replace(/\.(md|excalidraw)$/, '') : node.path
  const label = (
    <span
      className="group flex items-center gap-1 rounded"
      draggable={!editing}
      onDragStart={(e) => {
        e.stopPropagation()
        e.dataTransfer.setData('text/x-page', node.path)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => drop(e, childDir, move)}
    >
      {editing ? (
        <NameInput
          autoFocus
          value={node.name}
          className="min-w-0 flex-1 rounded border border-neutral-300 px-1"
          onDone={(name) => {
            setEditing(false)
            move(node.path, join(parentOf(node.path), name + ext(node.path)))
          }}
        />
      ) : isPage ? (
        <a
          href={pageUrl(node.path)}
          onClick={(e) => {
            e.preventDefault()
            go(node.path)
          }}
          className={`flex flex-1 items-center gap-1 truncate rounded px-1 hover:bg-neutral-100 ${page === node.path ? 'bg-neutral-200' : ''}`}
        >
          {node.icon ?? (node.type === 'doc' ? <FileText size={16} /> : <Presentation size={16} />)} {node.name}
        </a>
      ) : (
        <span className="flex flex-1 items-center gap-1 truncate px-1">
          <Folder size={16} /> {node.name}
        </span>
      )}
      <span className="invisible flex group-hover:visible">
        <button
          title="Rename"
          aria-label="Rename"
          className="grid size-5 place-items-center rounded hover:bg-neutral-200"
          onClick={(e) => {
            e.preventDefault() // inside <summary>: don't toggle
            setEditing(true)
          }}
        >
          <Pencil size={12} />
        </button>
        <AddMenu onAdd={(type) => create(childDir, type)} />
      </span>
    </span>
  )
  if (!node.children.length) return <div className="pl-4">{label}</div>
  return (
    <details open>
      <summary className="cursor-pointer">{label}</summary>
      <Tree nodes={node.children} {...props} />
    </details>
  )
}

function AddMenu({ onAdd }: { onAdd: (type: 'doc' | 'board') => void }) {
  // Native select keeps the menu accessible; it sits invisible on top of the icon.
  return (
    <span className="relative grid size-5 place-items-center rounded hover:bg-neutral-200">
      <Plus size={14} />
      <select
        aria-label="New page"
        className="absolute inset-0 cursor-pointer opacity-0"
        value=""
        onChange={(e) => onAdd(e.target.value as 'doc' | 'board')}
      >
        <option value="" disabled hidden />
        <option value="doc">New doc</option>
        <option value="board">New board</option>
      </select>
    </span>
  )
}
