import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  LayoutList,
  LayoutTemplate,
  MoreHorizontal,
  PanelLeftClose,
  Pencil,
  Plus,
  Presentation,
  Printer,
  RotateCcw,
  Search,
  Star,
  Settings as SettingsIcon,
  SquarePen,
  Trash2,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { MenuButton, type MenuGroup } from '@/components/Menu'
import NameInput from '@/components/NameInput'
import PageIcon from '@/components/PageIcon'
import { iconButton, skeleton } from '@/components/ui'
import type { Vault } from '@/lib/fs'
import { ext, join, pageUrl, parentOf } from '@/lib/paths'
import type { TreeNode } from './tree'

type Move = (from: string, to: string) => void
type Create = (dir: string, type: 'doc' | 'board') => void
type Remove = (node: TreeNode) => void

type SidebarProps = {
  root?: Vault
  createFromTemplate: (dir: string) => void // opens the template picker
  saveTemplate: (node: TreeNode) => void
  print: () => void
  openToday: () => void
  favorites: TreeNode[] // starred pages, in the order added
  favoriteSet: Set<string>
  toggleFavorite: (path: string) => void
  stored?: { name: string }
  loading: boolean
  tree: TreeNode[]
  page: string | null
  go: (path: string) => void
  create: Create
  move: Move
  remove: Remove
  reopen: () => void
  pickFolder: () => void
  openSettings: () => void
  openSearch: () => void
  hide: () => void
  git?: ReactNode // desktop-only git status row, above the folder and settings rows
}

const newPage = (create: Create, dir: string, fromTemplate: (dir: string) => void): MenuGroup[] => [
  {
    items: [
      { label: 'New doc', icon: FileText, onSelect: () => create(dir, 'doc') },
      { label: 'New board', icon: Presentation, onSelect: () => create(dir, 'board') },
      { label: 'New from template', icon: LayoutTemplate, onSelect: () => fromTemplate(dir) },
    ],
  },
]

const footerRow =
  'flex h-[var(--row-h)] w-full items-center gap-2.5 rounded-lg px-2 text-left text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900 active:bg-neutral-200'
const activeRow = 'bg-accent-soft font-medium text-neutral-900 hover:bg-accent-soft'

const SECTIONS_KEY = 'write-my-notes:sections' // collapsed sidebar sections

/** Workspace badge color from a hash of the folder name, picked from the icon palette. */
const BADGE = ['blue', 'green', 'purple', 'orange', 'pink', 'red', 'yellow', 'gray']
const badgeColor = (name: string) => `var(--icon-${BADGE[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % BADGE.length]})`

function useCollapsed() {
  const [collapsed, setCollapsed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(SECTIONS_KEY) ?? '[]')
    } catch {
      return []
    }
  })
  const toggle = (id: string) =>
    setCollapsed((c) => {
      const next = c.includes(id) ? c.filter((x) => x !== id) : [...c, id]
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(next))
      return next
    })
  return [collapsed, toggle] as const
}

type SectionProps = {
  id: string
  label: string
  open: boolean
  toggle: (id: string) => void
  actions?: ReactNode
  children: ReactNode
} & Pick<React.HTMLAttributes<HTMLDivElement>, 'onDragOver' | 'onDrop' | 'title'>

/** A collapsible sidebar section: small muted header with a chevron, optional hover actions. */
function Section({ id, label, open, toggle, actions, children, ...drop }: SectionProps) {
  return (
    <section aria-label={label} className="px-2 pb-1">
      <div className="group/sec flex h-7 items-center pr-1" {...drop}>
        <button
          aria-expanded={open}
          className="flex h-6 min-w-0 flex-1 items-center gap-1 rounded-md px-2 text-left text-xs font-medium text-neutral-500 transition-colors duration-150 hover:text-neutral-900"
          onClick={() => toggle(id)}
        >
          <span className="truncate">{label}</span>
          <ChevronRight size={12} className={`shrink-0 transition-[rotate] duration-150 ${open ? 'rotate-90' : ''}`} />
        </button>
        {actions && <span className="flex opacity-0 transition-opacity duration-150 group-focus-within/sec:opacity-100 group-hover/sec:opacity-100 has-[[aria-expanded=true]]:opacity-100">{actions}</span>}
      </div>
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} inert={!open}>
        <div className="overflow-hidden">{children}</div>
      </div>
    </section>
  )
}

const skeletonRows = (widths: number[]) => (
  <div aria-label="Loading pages" className="space-y-2.5 px-2 pt-2">
    {widths.map((w) => (
      <div key={w} className={`${skeleton} h-3.5`} style={{ width: `${w}%` }} />
    ))}
  </div>
)

export default function Sidebar({ root, openToday, favorites, stored, loading, tree, reopen, pickFolder, openSettings, openSearch, hide, git, ...props }: SidebarProps) {
  const { create, move } = props
  const [collapsed, toggle] = useCollapsed()
  return (
    <aside className="flex h-full w-full flex-col bg-neutral-50">
      <header className="flex h-12 shrink-0 items-center gap-0.5 px-2">
        {root ? (
          <MenuButton
            label="Workspace menu"
            className="mr-auto flex h-8 min-w-0 items-center gap-2 rounded-lg px-1.5 text-left transition-colors duration-150 hover:bg-neutral-100"
            groups={[
              {
                items: [
                  { label: 'Open another folder', icon: FolderOpen, onSelect: pickFolder },
                  { label: 'Settings', icon: SettingsIcon, onSelect: openSettings },
                ],
              },
            ]}
          >
            <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold text-white" style={{ background: badgeColor(root.name || 'N') }}>
              {[...(root.name || 'N')][0].toUpperCase()}
            </span>
            <span className="truncate font-semibold tracking-tight">{root.name || 'Notes'}</span>
            <ChevronDown size={14} className="shrink-0 text-neutral-500" />
          </MenuButton>
        ) : (
          <>
            <span aria-hidden className="ml-1.5 grid size-6 place-items-center rounded-md bg-neutral-900 text-[11px] font-bold text-white">
              N
            </span>
            <span className="mr-auto ml-2 font-semibold tracking-tight">Notedflow</span>
          </>
        )}
        {root && (
          <MenuButton label="New page" groups={newPage(create, '', props.createFromTemplate)} className={iconButton}>
            <SquarePen size={16} />
          </MenuButton>
        )}
        <button className={iconButton} title="Hide sidebar (Ctrl+\)" aria-label="Hide sidebar" onClick={hide}>
          <PanelLeftClose size={16} />
        </button>
      </header>
      {root && (
        <nav aria-label="Quick links" className="shrink-0 px-2 pb-2">
          <button className={footerRow} onClick={openSearch}>
            <Search size={18} className="text-neutral-500" /> <span className="mr-auto">Search</span>
            <kbd className="font-sans text-xs text-neutral-500">Ctrl+K</kbd>
          </button>
          <button className={footerRow} onClick={openToday}>
            <CalendarDays size={18} className="text-neutral-500" /> Today
          </button>
          <button aria-current={props.page === '.all' ? 'page' : undefined} className={`${footerRow} ${props.page === '.all' ? activeRow : ''}`} onClick={() => props.go('.all')}>
            <LayoutList size={18} className="text-neutral-500" /> All pages
          </button>
        </nav>
      )}
      <div className="min-h-0 flex-1 overflow-auto pb-2">
        {favorites.length > 0 && (
          <Section id="favorites" label="Favorites" open={!collapsed.includes('favorites')} toggle={toggle}>
            {favorites.map((f) => (
              <button
                key={f.path}
                aria-current={props.page === f.path ? 'page' : undefined}
                className={`${footerRow} ${props.page === f.path ? activeRow : ''}`}
                onClick={() => props.go(f.path)}
              >
                <span className="grid size-5 shrink-0 place-items-center text-[16px] leading-none">
                  <PageIcon icon={f.icon} color={f.iconColor} size={18} fallback={f.type === 'doc' ? FileText : Presentation} />
                </span>
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </Section>
        )}
        {root ? (
          <Section
            id="pages"
            label="Pages"
            open={!collapsed.includes('pages')}
            toggle={toggle}
            title="Drop a page here to move it to the top level"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => drop(e, '', move)}
            actions={
              <MenuButton label="New page" groups={newPage(create, '', props.createFromTemplate)} className={`${iconButton} size-6 hover:bg-neutral-200`}>
                <Plus size={15} />
              </MenuButton>
            }
          >
            <nav aria-label="Pages">
              {loading ? (
                skeletonRows([70, 55, 80, 45, 65])
              ) : !tree.length ? (
                <p className="px-2 py-1 text-neutral-500">No pages yet. Use the + button to add one.</p>
              ) : (
                <Tree nodes={tree} depth={0} {...props} />
              )}
            </nav>
          </Section>
        ) : (
          loading && skeletonRows([70, 55, 80])
        )}
      </div>
      <footer className="shrink-0 space-y-0.5 border-t border-neutral-200 p-2">
        {git}
        {stored && !root && (
          <button className={footerRow} onClick={reopen}>
            <RotateCcw size={16} className="text-neutral-500" /> <span className="truncate">Reopen “{stored.name}”</span>
          </button>
        )}
        {!root && (
          <button className={footerRow} onClick={pickFolder}>
            <FolderOpen size={16} className="text-neutral-500" /> Open folder
          </button>
        )}
        {root && (
          <button aria-current={props.page === '.trash' ? 'page' : undefined} className={`${footerRow} ${props.page === '.trash' ? activeRow : ''}`} onClick={() => props.go('.trash')}>
            <Trash2 size={16} className="text-neutral-500" /> Trash
          </button>
        )}
        <button className={footerRow} onClick={openSettings}>
          <SettingsIcon size={16} className="text-neutral-500" /> Settings
        </button>
      </footer>
    </aside>
  )
}

type TreeProps = {
  createFromTemplate: (dir: string) => void
  saveTemplate: (node: TreeNode) => void
  print: () => void
  favoriteSet: Set<string>
  toggleFavorite: (path: string) => void
  nodes: TreeNode[]
  depth: number
  page: string | null
  go: (path: string) => void
  create: Create
  move: Move
  remove: Remove
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
  "min-w-0 flex-1 truncate text-left outline-none after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent"

function Node({ node, depth, ...props }: { node: TreeNode } & Omit<TreeProps, 'nodes'>) {
  const { page, go, create, move, remove, favoriteSet, toggleFavorite } = props
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(true)
  const [over, setOver] = useState(false) // a page is dragged over this row
  const isPage = node.type !== 'folder'
  const hasChildren = node.children.length > 0
  const active = page === node.path
  const childDir = isPage ? node.path.replace(/\.(md|excalidraw)$/, '') : node.path
  const Icon = node.type === 'doc' ? FileText : node.type === 'board' ? Presentation : Folder

  return (
    <>
      <div
        className={`group relative flex h-[var(--row-h)] items-center gap-1 rounded-lg pr-1 transition-colors duration-150 ${
          active ? 'bg-accent-soft font-medium text-neutral-900' : 'text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200'
        } ${over ? 'bg-accent-soft outline-1 -outline-offset-1 outline-accent' : ''}`}
        style={{ paddingLeft: 4 + depth * 14 }}
        draggable={!editing}
        onDragStart={(e) => {
          e.stopPropagation()
          e.dataTransfer.setData('text/x-page', node.path)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          setOver(false)
          drop(e, childDir, move)
        }}
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
        <span className="grid size-5 shrink-0 place-items-center text-[16px] leading-none text-neutral-500">
          <PageIcon icon={isPage ? node.icon : undefined} color={node.iconColor} fallback={Icon} size={18} />
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
              groups={[
                ...(isPage
                  ? [{ items: [{ label: favoriteSet.has(node.path) ? 'Remove from favorites' : 'Add to favorites', icon: Star, onSelect: () => toggleFavorite(node.path) }] }]
                  : []),
                ...(node.type === 'doc'
                  ? [
                      {
                        items: [
                          { label: 'Save as template', icon: LayoutTemplate, onSelect: () => props.saveTemplate(node) },
                          ...(active ? [{ label: 'Print / Save as PDF', icon: Printer, onSelect: () => props.print() }] : []),
                        ],
                      },
                    ]
                  : []),
                { items: [{ label: 'Rename', icon: Pencil, onSelect: () => setEditing(true) }] },
                { items: [{ label: 'Delete', icon: Trash2, onSelect: () => remove(node) }] },
              ]}
              className={`${iconButton} size-6 hover:bg-neutral-200`}
            >
              <MoreHorizontal size={15} />
            </MenuButton>
            <MenuButton label={`Add inside ${node.name}`} groups={newPage(create, childDir, props.createFromTemplate)} className={`${iconButton} size-6 hover:bg-neutral-200`}>
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
