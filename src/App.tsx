import { useEffect, useState } from 'react'
import { createPage, listEntries, loadRoot, saveRoot } from './fs'
import { buildTree, type TreeNode } from './tree'

const pageUrl = (path: string) => '/page/' + path.split('/').map(encodeURIComponent).join('/')
const currentPage = () =>
  location.pathname.startsWith('/page/') ? decodeURIComponent(location.pathname.slice('/page/'.length)) : null

export default function App() {
  const [root, setRoot] = useState<FileSystemDirectoryHandle>()
  const [stored, setStored] = useState<FileSystemDirectoryHandle>()
  const [tree, setTree] = useState<TreeNode[]>([])
  const [page, setPage] = useState(currentPage)

  async function open(dir: FileSystemDirectoryHandle) {
    setRoot(dir)
    setTree(buildTree(await listEntries(dir)))
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
            <div className="flex items-center justify-between px-2 font-medium">
              {root.name}
              <AddMenu onAdd={(type) => create('', type)} />
            </div>
            <Tree nodes={tree} page={page} go={go} create={create} />
          </>
        )}
      </aside>
      <main className="min-w-0 flex-1 p-8 text-neutral-500">{page ?? 'No page selected'}</main>
    </div>
  )
}

type TreeProps = {
  nodes: TreeNode[]
  page: string | null
  go: (path: string) => void
  create: (dir: string, type: 'doc' | 'board') => void
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

function Node({ node, page, go, create }: { node: TreeNode } & Omit<TreeProps, 'nodes'>) {
  const isPage = node.type !== 'folder'
  const childDir = isPage ? node.path.replace(/\.(md|excalidraw)$/, '') : node.path
  const label = (
    <span className="group flex items-center gap-1">
      {isPage ? (
        <a
          href={pageUrl(node.path)}
          onClick={(e) => {
            e.preventDefault()
            go(node.path)
          }}
          className={`flex-1 truncate rounded px-1 hover:bg-neutral-100 ${page === node.path ? 'bg-neutral-200' : ''}`}
        >
          {node.icon ?? (node.type === 'doc' ? '📄' : '🎨')} {node.name}
        </a>
      ) : (
        <span className="flex-1 truncate px-1">📁 {node.name}</span>
      )}
      <span className="invisible group-hover:visible">
        <AddMenu onAdd={(type) => create(childDir, type)} />
      </span>
    </span>
  )
  if (!node.children.length) return <div className="pl-4">{label}</div>
  return (
    <details open>
      <summary className="cursor-pointer">{label}</summary>
      <Tree nodes={node.children} page={page} go={go} create={create} />
    </details>
  )
}

function AddMenu({ onAdd }: { onAdd: (type: 'doc' | 'board') => void }) {
  return (
    <select
      aria-label="New page"
      className="w-5 cursor-pointer appearance-none bg-transparent text-center"
      value=""
      onChange={(e) => onAdd(e.target.value as 'doc' | 'board')}
    >
      <option value="" disabled hidden>
        +
      </option>
      <option value="doc">New doc</option>
      <option value="board">New board</option>
    </select>
  )
}
