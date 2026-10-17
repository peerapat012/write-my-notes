import {
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  MoreHorizontal,
  PanelLeftClose,
  Pencil,
  Plus,
  Presentation,
  RotateCcw,
  Search,
  Settings as SettingsIcon,
  SquarePen,
} from 'lucide-react'
import { useState } from 'react'
import { MenuButton, type MenuGroup } from '@/components/Menu'
import NameInput from '@/components/NameInput'
import { iconButton, skeleton } from '@/components/ui'
import { ext, join, pageUrl, parentOf } from '@/lib/paths'
import type { TreeNode } from './tree'

type Move = (from: string, to: string) => void
type Create = (dir: string, type: 'doc' | 'board') => void

type SidebarProps = {
  root?: FileSystemDirectoryHandle
  stored?: FileSystemDirectoryHandle
  loading: boolean
  tree: TreeNode[]
  page: string | null
  go: (path: string) => void
  create: Create
  move: Move
  reopen: () => void
  pickFolder: () => void
  openSettings: () => void
  openSearch: () => void
  hide: () => void
}

const newPage = (create: Create, dir: string): MenuGroup[] => [
  {
    items: [
      { label: 'New doc', icon: FileText, onSelect: () => create(dir, 'doc') },
      { label: 'New board', icon: Presentation, onSelect: () => create(dir, 'board') },
    ],
  },
]

const footerRow =
  'flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900'

export default function Sidebar({ root, stored, loading, tree, reopen, pickFolder, openSettings, openSearch, hide, ...props }: SidebarProps) {
  const { create, move } = props
  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-neutral-200 bg-neutral-50">
      <header className="flex h-12 shrink-0 items-center gap-0.5 pr-2 pl-3">
        <span aria-hidden className="grid size-5 place-items-center rounded-[5px] bg-neutral-900 text-[11px] font-bold text-white">
          N
        </span>
        <span className="mr-auto ml-2 font-semibold tracking-tight">Notedflow</span>
        {root && (
          <>
            <button className={iconButton} title="Search (Ctrl+K)" aria-label="Search" onClick={openSearch}>
              <Search size={16} />
            </button>
            <MenuButton label="New page" groups={newPage(create, '')} className={iconButton}>
              <SquarePen size={16} />
            </MenuButton>
          </>
        )}
        <button className={iconButton} title="Hide sidebar (Ctrl+\)" aria-label="Hide sidebar" onClick={hide}>
          <PanelLeftClose size={16} />
        </button>
      </header>
      {root && (
        <div
          className="mx-2 truncate rounded-md px-2 pt-2 pb-1 text-xs font-medium text-neutral-500"
          title={`${root.name} (drop a page here to move it to the top level)`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => drop(e, '', move)}
        >
          {root.name}
        </div>
      )}
      <nav aria-label="Pages" className="min-h-0 flex-1 overflow-auto px-2 pb-2">
        {loading ? (
          <div aria-label="Loading pages" className="space-y-2.5 px-2 pt-2">
            {[70, 55, 80, 45, 65].map((w) => (
              <div key={w} className={`${skeleton} h-3.5`} style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : root && !tree.length ? (
          <p className="px-2 py-1 text-neutral-500">No pages yet. Use the new page button above to add one.</p>
        ) : (
          root && <Tree nodes={tree} depth={0} {...props} />
        )}
      </nav>
      <footer className="shrink-0 border-t border-neutral-200 p-2">
        {stored && !root && (
          <button className={footerRow} onClick={reopen}>
            <RotateCcw size={16} className="text-neutral-500" /> <span className="truncate">Reopen “{stored.name}”</span>
          </button>
        )}
        <button className={footerRow} onClick={pickFolder}>
          <FolderOpen size={16} className="text-neutral-500" /> {root ? 'Open another folder' : 'Open folder'}
        </button>
        <button className={footerRow} onClick={openSettings}>
          <SettingsIcon size={16} className="text-neutral-500" /> Settings
        </button>
      </footer>
    </aside>
  )
}

type TreeProps = {
  nodes: TreeNode[]
  depth: number
  page: string | null
  go: (path: string) => void
  create: Create
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
    <ul>
      {nodes.map((n) => (
        <li key={n.path}>
          <Node node={n} {...props} />
        </li>
      ))}
    </ul>
  )
}

// The label's ::after covers the whole row, so the row is one click target; buttons sit above it (z-10).
const rowTarget =
  "min-w-0 flex-1 truncate text-left outline-none after:absolute after:inset-0 after:rounded-md after:content-[''] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent"

function Node({ node, depth, ...props }: { node: TreeNode } & Omit<TreeProps, 'nodes'>) {
  const { page, go, create, move } = props
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(true)
  const isPage = node.type !== 'folder'
  const hasChildren = node.children.length > 0
  const active = page === node.path
  const childDir = isPage ? node.path.replace(/\.(md|excalidraw)$/, '') : node.path
  const Icon = node.type === 'doc' ? FileText : node.type === 'board' ? Presentation : Folder

  return (
    <>
      <div
        className={`group relative flex h-7 items-center gap-1 rounded-md pr-1 transition-colors duration-150 ${
          active ? 'bg-accent-soft font-medium text-neutral-900' : 'text-neutral-700 hover:bg-neutral-100'
        }`}
        style={{ paddingLeft: 4 + depth * 14 }}
        draggable={!editing}
        onDragStart={(e) => {
          e.stopPropagation()
          e.dataTransfer.setData('text/x-page', node.path)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => drop(e, childDir, move)}
      >
        {hasChildren ? (
          <button
            aria-label={open ? 'Collapse' : 'Expand'}
            aria-expanded={open}
            className="relative z-10 grid size-5 shrink-0 place-items-center rounded text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
            onClick={() => setOpen((o) => !o)}
          >
            <ChevronRight size={14} className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <span className="size-5 shrink-0" />
        )}
        <span className="grid size-5 shrink-0 place-items-center text-[15px] leading-none text-neutral-500">
          {isPage && node.icon ? node.icon : <Icon size={16} />}
        </span>
        {editing ? (
          <NameInput
            autoFocus
            value={node.name}
            className="relative z-10 h-6 min-w-0 flex-1 rounded border border-accent bg-white px-1 outline-none"
            onDone={(name) => {
              setEditing(false)
              move(node.path, join(parentOf(node.path), name + ext(node.path)))
            }}
          />
        ) : isPage ? (
          <a
            href={pageUrl(node.path)}
            aria-current={active ? 'page' : undefined}
            className={rowTarget}
            onClick={(e) => {
              e.preventDefault()
              go(node.path)
            }}
          >
            {node.name}
          </a>
        ) : (
          <button className={rowTarget} aria-expanded={hasChildren ? open : undefined} onClick={() => setOpen((o) => !o)}>
            {node.name}
          </button>
        )}
        {!editing && (
          <span className="relative z-10 flex opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 has-[[aria-expanded=true]]:opacity-100">
            <MenuButton
              label={`${node.name} actions`}
              groups={[{ items: [{ label: 'Rename', icon: Pencil, onSelect: () => setEditing(true) }] }]}
              className={`${iconButton} size-6 hover:bg-neutral-200`}
            >
              <MoreHorizontal size={15} />
            </MenuButton>
            <MenuButton label={`Add inside ${node.name}`} groups={newPage(create, childDir)} className={`${iconButton} size-6 hover:bg-neutral-200`}>
              <Plus size={15} />
            </MenuButton>
          </span>
        )}
      </div>
      {hasChildren && (
        <div className={`grid transition-[grid-template-rows] duration-150 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} inert={!open}>
          <div className="overflow-hidden">
            <Tree nodes={node.children} depth={depth + 1} {...props} />
          </div>
        </div>
      )}
    </>
  )
}
