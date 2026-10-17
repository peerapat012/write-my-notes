import { FileText, Folder, Pencil, Plus, Presentation, Settings as SettingsIcon } from 'lucide-react'
import { useState } from 'react'
import NameInput from '@/components/NameInput'
import { ext, join, pageUrl, parentOf } from '@/lib/paths'
import type { TreeNode } from './tree'

type Move = (from: string, to: string) => void

type SidebarProps = {
  root?: FileSystemDirectoryHandle
  stored?: FileSystemDirectoryHandle
  tree: TreeNode[]
  page: string | null
  go: (path: string) => void
  create: (dir: string, type: 'doc' | 'board') => void
  move: Move
  reopen: () => void
  pickFolder: () => void
  openSettings: () => void
}

export default function Sidebar({ root, stored, tree, reopen, pickFolder, openSettings, ...props }: SidebarProps) {
  const { create, move } = props
  return (
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
          <Tree nodes={tree} {...props} />
        </>
      )}
      <button className="mt-auto flex items-center gap-2 rounded px-2 py-1 text-left hover:bg-neutral-100" onClick={openSettings}>
        <SettingsIcon size={16} /> Settings
      </button>
    </aside>
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
