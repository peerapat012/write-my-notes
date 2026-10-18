import Toasts from '@/components/Toast'
import PagePeek from '@/features/peek/PagePeek'
import { nav, setPages, titleOf } from '@/lib/pages'
import { toast, toastError } from '@/lib/toast'
import { CalendarDays, FileText, FolderOpen, LayoutList, LayoutTemplate, Link, Moon, PanelLeftOpen, Presentation, Printer, Search, Settings as SettingsIcon, Sun, Trash2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Dialog from '@/components/Dialog'
import TitleBar from '@/components/TitleBar'
import TopBar from '@/components/TopBar'
import type { MenuGroup } from '@/components/Menu'
import RightPanel from '@/components/RightPanel'
import EmptyState from '@/components/EmptyState'

import { dangerButton, ghostButton, iconButton, primaryButton, secondaryButton } from '@/components/ui'
import BoardPage from '@/features/board/BoardPage'
import DocPage from '@/features/doc/DocPage'
import OutlineList from '@/features/doc/OutlineList'
import type { Heading } from '@/features/doc/outline'
import { createdStamp, dirty, flushes, isTauri, pickVault, restoreVault, type Stored, type Vault } from '@/lib/fs'
import { linkTargets, movedPath } from '@/lib/links'
import { ext, join, pageUrl, parentOf, untitledName } from '@/lib/paths'
import SearchPalette from '@/features/search/SearchPalette'
import type { BoardText } from '@/features/search/boardText'
import type { SearchIndex } from '@/features/search/search'
import { loadSettings, saveSettings, type Settings } from '@/features/settings/settings'
import SettingsDialog from '@/features/settings/SettingsDialog'
import SetupWizard from '@/features/git/SetupWizard'
import GitFooter from '@/features/git/GitFooter'
import HistoryTab from '@/features/history/HistoryTab'
import VersionView, { type Viewing } from '@/features/history/VersionView'
import { showFile, type Version } from '@/lib/git'
import GraphPage from '@/features/history/GraphPage'
import { dailyPath, localDate } from '@/features/templates/daily'
import TemplatePicker from '@/features/templates/TemplatePicker'
import { fromTemplate, journal, toTemplate } from '@/features/templates/templates'
import { splitFrontMatter } from '@/features/doc/frontmatter'
import { dropFavorites, loadFavorites, moveFavorites, saveFavorites, toggleFavorite } from '@/features/favorites/favorites'
import { backlinks } from '@/features/doc/backlinks'
import ChatTab, { type BoardChat } from '@/features/chat/ChatTab'
import { chatStore } from '@/ai/chatStore'
import { pruneChats } from '@/ai/chat'
import AllPagesPage from '@/features/allpages/AllPagesPage'
import StartPage from '@/features/allpages/StartPage'
import { buildRows, recentRows } from '@/features/allpages/allPages'
import TrashPage from '@/features/trash/TrashPage'
import Sidebar from '@/features/sidebar/Sidebar'
import { buildTree, deletion, type Entry, type TreeNode } from '@/features/sidebar/tree'

const findNode = (nodes: TreeNode[], path: string): TreeNode | undefined => {
  for (const n of nodes) {
    if (n.path === path) return n
    const hit = findNode(n.children, path)
    if (hit) return hit
  }
}

const PAGE_PREFIX = import.meta.env.BASE_URL + 'page/' // '/page/' locally, '/write-my-notes/page/' on Pages
const currentPage = () =>
  location.pathname.startsWith(PAGE_PREFIX) ? decodeURIComponent(location.pathname.slice(PAGE_PREFIX.length)) : null

const SIDEBAR_KEY = 'write-my-notes:sidebar'
const PANEL_KEY = 'write-my-notes:panel'
const WIDTH_KEY = 'write-my-notes:sidebar-width'
const DEFAULT_WIDTH = 260
const clampWidth = (w: number) => Math.min(400, Math.max(220, w))

const darkQuery = matchMedia('(prefers-color-scheme: dark)')
const subscribeDark = (cb: () => void) => {
  darkQuery.addEventListener('change', cb)
  return () => darkQuery.removeEventListener('change', cb)
}

export default function App() {
  const [root, setRoot] = useState<Vault>()
  const [stored, setStored] = useState<Stored>()
  const [entries, setEntries] = useState<Entry[]>([])
  const tree = useMemo(() => buildTree(entries), [entries])
  const exists = useMemo(() => new Set(entries.map((e) => e.path)), [entries])
  // Rebuilt on every scan (open, focus rescan, move) and doc or board save.
  const recent = useMemo(() => recentRows(buildRows(entries)), [entries])
  const index = useMemo<SearchIndex>(
    () => new Map(entries.filter((e) => /\.(md|excalidraw)$/.test(e.path)).map((e) => [e.path, e.boardTexts ?? e.text ?? ''])),
    [entries],
  )
  const icons = useMemo(() => new Map(entries.map((e) => [e.path, { icon: e.icon, iconColor: e.iconColor }])), [entries])
  const [favs, setFavs] = useState<string[]>([]) // favorite page paths of the open notes folder
  const [page, setPage] = useState(currentPage)
  const docTexts = useMemo(() => new Map(entries.flatMap((e) => (e.path.endsWith('.md') && e.text !== undefined ? [[e.path, e.text] as const] : []))), [entries]) // doc cards on boards show these
  /** What the AI chat reads of a page: a doc's markdown, or a board's texts. */
  const pageText = (path: string) => (path.endsWith('.md') ? docTexts.get(path) : entries.find((e) => e.path === path)?.boardTexts?.map((t) => t.text).join(' · '))
  // Pages that link to or embed the open doc.
  const linksTo = (target: string | null | undefined) =>
    target?.endsWith('.md')
      ? backlinks(target, entries).map((path) => ({
          path,
          title: path.slice(path.lastIndexOf('/') + 1).replace(/\.(md|excalidraw)$/, ''),
          icon: icons.get(path)?.icon,
          iconColor: icons.get(path)?.iconColor,
        }))
      : []
  const linkedFrom = useMemo(() => linksTo(page), [page, entries, icons]) // eslint-disable-line react-hooks/exhaustive-deps
  const [peek, setPeek] = useState<string>() // a page open in the peek modal
  // Widgets in the editor (page chips, cards, the data table) read the pages from this store.
  useEffect(
    () =>
      setPages(
        entries
          .filter((e) => e.kind === 'file' && /\.(md|excalidraw)$/.test(e.path) && !/^\.(trash|templates)(\/|$)/.test(e.path))
          .map((e) => ({ path: e.path, title: titleOf(e.path), type: e.path.endsWith('.md') ? 'doc' : 'board', icon: e.icon, iconColor: e.iconColor, mtime: e.mtime, text: e.text })),
      ),
    [entries],
  )
  const favSet = useMemo(() => new Set(favs), [favs])
  // Starred pages that still exist, in the order added.
  const favorites = useMemo(
    () =>
      favs.filter((p) => exists.has(p)).map((path): TreeNode => ({
        path,
        name: path.slice(path.lastIndexOf('/') + 1).replace(/\.(md|excalidraw)$/, ''),
        type: path.endsWith('.md') ? 'doc' : 'board',
        icon: icons.get(path)?.icon,
        iconColor: icons.get(path)?.iconColor,
        children: [],
      })),
    [favs, exists, icons],
  )
  const [zoomTo, setZoomTo] = useState<{ id: string }>() // board element a search hit asked to zoom to
  const [rev, setRev] = useState(0) // bumped after a move so the open page re-reads from disk
  const [settings, setSettings] = useState(() => loadSettings())
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [deleting, setDeleting] = useState<TreeNode>() // delete confirmation dialog
  const [replacing, setReplacing] = useState<TreeNode>() // template replace confirmation dialog
  const deletingPages = deleting && deletion(deleting).childPages
  const [templateDir, setTemplateDir] = useState<string>() // folder for a doc made from a template: the picker is open
  const [fresh, setFresh] = useState<string>() // a page just created: its title takes focus
  const [loading, setLoading] = useState(true) // until the stored folder (if any) has been scanned
  const [sidebar, setSidebar] = useState(() => localStorage.getItem(SIDEBAR_KEY) !== 'hidden')
  const [width, setWidth] = useState(() => clampWidth(Number(localStorage.getItem(WIDTH_KEY)) || DEFAULT_WIDTH))
  const [resizing, setResizing] = useState(false) // dragging the sidebar edge: no width transition
  const [panel, setPanel] = useState(() => localStorage.getItem(PANEL_KEY) === 'shown') // right panel, closed by default
  const [outline, setOutline] = useState<Heading[]>([])
  const [preview, setPreview] = useState<{ page: string; content: string }>() // an AI change shown read-only
  const boardChat = useRef<BoardChat>(undefined) // the open board, for the chat tab
  const [viewing, setViewing] = useState<Viewing>() // an old version shown read-only in place of the page
  const [setup, setSetup] = useState(false) // git setup wizard
  const [historyRev, setHistoryRev] = useState(0) // bumped after versions are saved or pulled
  const view = viewing?.page === page ? viewing : undefined
  const systemDark = useSyncExternalStore(subscribeDark, () => darkQuery.matches)
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && systemDark)
  useLayoutEffect(() => void document.documentElement.classList.toggle('dark', dark), [dark]) // before paint: no light flash

  function changeSettings(next: Settings) {
    setSettings(next)
    saveSettings(next)
  }

  function toggleSidebar() {
    setSidebar((shown) => {
      localStorage.setItem(SIDEBAR_KEY, shown ? 'hidden' : 'shown')
      return !shown
    })
  }

  function resizeSidebar(w: number) {
    const next = clampWidth(w)
    setWidth(next)
    localStorage.setItem(WIDTH_KEY, String(next))
  }

  function togglePanel() {
    setPanel((shown) => {
      localStorage.setItem(PANEL_KEY, shown ? 'hidden' : 'shown')
      return !shown
    })
  }

  async function openVersion(v: Version) {
    try {
      setViewing({ page: page!, hash: v.hash, date: v.date, content: await showFile(v.hash, v.path) })
    } catch (e) {
      toastError(`Could not open this version: ${e}`)
    }
  }

  /** Writes the old content like any edit, then reloads the page from disk. */
  async function restoreVersion() {
    if (!root || !view) return
    try {
      await root.write(view.page, view.content)
    } catch (e) {
      return toastError(`Could not restore: ${e}`)
    }
    setViewing(undefined)
    await open(root)
    setRev((r) => r + 1)
  }

  /** Changes the open folder's favorites, read fresh from storage so a stale render cannot undo another change. */
  function updateFavs(change: (paths: string[]) => string[]) {
    if (!root) return
    const next = change(loadFavorites(root.id))
    saveFavorites(root.id, next)
    setFavs(next)
  }

  async function open(dir: Vault) {
    setRoot(dir)
    setFavs(loadFavorites(dir.id))
    setEntries(await dir.list())
    setLoading(false)
  }

  /** Opens a folder the user just picked or re-granted: the tree shows its loading state until scanned. */
  function openFresh(dir: Vault) {
    setEntries([])
    setLoading(true)
    return open(dir)
  }

  useEffect(() => {
    restoreVault().then(async ({ vault, stored }) => {
      if (vault) return open(vault)
      setStored(stored) // re-granting needs a user gesture: show a reopen button
      setLoading(false)
    })
    pruneChats(chatStore).catch(() => {}) // chats older than 7 days
    const onPop = () => setPage(currentPage())
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

  // Print is always light: drop the dark theme while the print preview is made, and mark where it came from so
  // diagrams drawn for dark can be flipped back (index.css).
  useEffect(() => {
    const before = () => {
      document.documentElement.classList.remove('dark')
      document.documentElement.toggleAttribute('data-print-from-dark', dark)
    }
    const after = () => {
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.removeAttribute('data-print-from-dark')
    }
    addEventListener('beforeprint', before)
    addEventListener('afterprint', after)
    return () => {
      removeEventListener('beforeprint', before)
      removeEventListener('afterprint', after)
    }
  }, [dark])

  // Ctrl+K opens the palette, Ctrl+\ hides or shows the sidebar. Capture phase: beat the browser's search
  // bar and editor shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      // Physical keys (`code`), so the shortcuts also work with a non-Latin layout such as Thai.
      if (e.code === 'KeyK' && root) setShowSearch(true)
      else if (e.code === 'Backslash') toggleSidebar()
      else return
      e.preventDefault()
      e.stopPropagation()
    }
    addEventListener('keydown', onKey, true)
    return () => removeEventListener('keydown', onKey, true)
  }, [root])

  // Rescan on focus to catch pages added or removed on disk (e.g. by `git pull`).
  useEffect(() => {
    if (!root) return
    const onFocus = () => root.list().then(setEntries)
    addEventListener('focus', onFocus)
    return () => removeEventListener('focus', onFocus)
  }, [root])

  async function pickFolder() {
    try {
      await openFresh(await pickVault())
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toastError(`Could not open folder: ${e}`)
    }
  }

  async function reopen() {
    const dir = await stored?.reopen()
    if (dir) openFresh(dir)
  }

  function go(path: string, elementId?: string) {
    setPreview(undefined)
    setPeek(undefined)
    setZoomTo(elementId ? { id: elementId } : undefined)
    history.pushState(null, '', pageUrl(path))
    setPage(path)
  }

  // Page links in editor widgets open through these: Ctrl/Cmd+click full screen, a plain click in the peek.
  useEffect(() => {
    nav.go = go
    nav.peek = (path) => (path === page ? go(path) : setPeek(path))
  })

  async function move(from: string, to: string) {
    if (!root || from === to) return
    try {
      await Promise.all([...flushes].map((f) => f()))
      await root.move(from, to)
    } catch (e) {
      toastError(`Could not move: ${e}`)
      return open(root)
    }
    updateFavs((f) => moveFavorites(f, from, to))
    setPeek((p) => p && movedPath(p, from, to))
    await open(root)
    const next = page && movedPath(page, from, to)
    if (next !== page) history.replaceState(null, '', pageUrl(next!))
    setPage(next)
    setRev((r) => r + 1)
  }

  /** Deletes a page with its child folder, or a plain folder. Leaves the open page first if it goes too. */
  async function remove(node: TreeNode) {
    setDeleting(undefined)
    if (!root) return
    const { paths } = deletion(node)
    const inside = (p: string) => paths.some((d) => p === d || p.startsWith(d + '/'))
    try {
      await Promise.all([...flushes].map((f) => f())) // so no pending autosave writes a deleted file back
      for (const p of [...dirty]) if (inside(p)) dirty.delete(p)
      if (peek && inside(peek)) setPeek(undefined)
      if (page && inside(page)) {
        const dir = parentOf(node.path)
        const parent = dir && [dir + '.md', dir + '.excalidraw'].find((p) => exists.has(p))
        if (parent) go(parent)
        else {
          history.pushState(null, '', import.meta.env.BASE_URL)
          setPage(null)
        }
      }
      await root.trash(paths)
      updateFavs((f) => dropFavorites(f, paths))
    } catch (e) {
      toastError(`Could not move to Trash: ${e}`)
    }
    await open(root)
  }

  /** After `git pull`: rescan for new, changed and removed pages, and remount the open one so it re-reads from disk. */
  async function pulled() {
    if (!root) return
    await open(root)
    setRev((r) => r + 1)
  }

  // Outline for docs; History (git) on the desktop for docs and boards. No tabs: no panel and no toggle.
  const tabs = [
    ...(page?.endsWith('.md') && !view ? [{ id: 'outline', label: 'Outline', content: <OutlineList headings={outline} /> }] : []),
    ...(page && /\.(md|excalidraw)$/.test(page) && root
      ? [
          {
            id: 'ai',
            label: 'AI',
            content: (
              <ChatTab
                vault={root}
                page={page}
                pages={[...exists].filter((p) => /\.(md|excalidraw)$/.test(p))}
                pageText={pageText}
                model={settings.model}
                openSettings={() => setShowSettings(true)}
                flush={() => Promise.all([...flushes].map((f) => f()))}
                onChanged={async () => {
                  await open(root)
                  setRev((r) => r + 1)
                }}
                onPreview={(path, content) => setPreview({ page: path, content })}
                board={boardChat}
              />
            ),
          },
        ]
      : []),
    ...(isTauri && page && /\.(md|excalidraw)$/.test(page)
      ? [{ id: 'history', label: 'History', content: <HistoryTab path={page} refreshKey={historyRev} viewing={view?.hash} onOpen={openVersion} onSetup={() => setSetup(true)} /> }]
      : []),
  ]

  const rename = (from: string, name: string) => move(from, join(parentOf(from), name + ext(from)))

  /** Creates `Untitled` (or `Untitled 2`...) in `dir`, opens it and focuses its title. */
  async function create(dir: string, type: 'doc' | 'board') {
    if (!root) return
    const path = await root.createPage(dir, untitledName(exists, dir, type === 'doc' ? '.md' : '.excalidraw'), type)
    await open(root)
    setFresh(path)
    go(path)
  }

  /** Creates `Untitled` in `dir` from a template body and opens it. */
  async function createFromTemplate(dir: string, body: string) {
    setTemplateDir(undefined)
    if (!root) return
    const path = await root.createPage(dir, untitledName(exists, dir, '.md'), 'doc')
    await root.write(path, fromTemplate(body, createdStamp(), localDate()))
    await open(root)
    setFresh(path)
    go(path)
  }

  /** Writes a doc's body (without `created`) to `.templates/<name>.md`; a name already taken asks first (Dialog). */
  async function saveAsTemplate(node: TreeNode, replace = false) {
    if (!root) return
    try {
      await Promise.all([...flushes].map((f) => f()))
      const body = toTemplate(await root.read(node.path))
      const taken = (await root.listTemplates()).includes(node.name)
      if (taken && !replace) return setReplacing(node)
      if (!taken) await root.createPage('.templates', node.name, 'doc')
      await root.write(`.templates/${node.name}.md`, body)
      toast(`Saved template “${node.name}”`, 'success')
    } catch (e) {
      toastError(`Could not save the template: ${e}`)
    }
  }

  /** Opens today's note, creating `Daily/YYYY-MM-DD.md` from the Journal template when there is none. */
  async function openToday() {
    if (!root) return
    const path = dailyPath()
    try {
      if (!exists.has(path)) {
        await root.createPage('Daily', localDate(), 'doc') // keeps a file that is already there
        if (!splitFrontMatter(await root.read(path)).body.trim()) await root.write(path, fromTemplate(journal.body, createdStamp(), localDate()))
        await open(root)
      }
      go(path)
    } catch (e) {
      toastError(`Could not open today’s note: ${e}`)
    }
  }

  /** Creates `<board> summary.md` next to the board (never overwriting one), fills it, and opens it. */
  async function saveSummary(board: string, body: string) {
    if (!root) return
    const dir = parentOf(board)
    const base = board.slice(board.lastIndexOf('/') + 1, -'.excalidraw'.length) + ' summary'
    let name = base
    for (let i = 2; exists.has(join(dir, name + '.md')); i++) name = `${base} ${i}`
    const path = await root.createPage(dir, name, 'doc')
    await root.write(path, (await root.read(path)) + body) // keeps the `created` front matter
    await open(root)
    go(path)
  }

  // Doc and board pages get the breadcrumb (barTitle ''); other screens a title; the start page no bar.
  const barTitle =
    preview ? 'AI preview' : view ? 'Version' : page === '.trash' ? 'Trash' : page === '.all' ? 'All pages' : page === '.history' ? 'History' : page && /\.(md|excalidraw)$/.test(page) ? '' : undefined
  const pageNode = page && barTitle === '' ? findNode(tree, page) : undefined
  const pageMenu: MenuGroup[] | undefined = pageNode && [
    ...(pageNode.type === 'doc'
      ? [
          {
            items: [
              { label: 'Save as template', icon: LayoutTemplate, onSelect: () => saveAsTemplate(pageNode) },
              { label: 'Print / Save as PDF', icon: Printer, onSelect: () => print() },
            ],
          },
        ]
      : []),
    {
      items: [
        {
          label: 'Copy link',
          icon: Link,
          onSelect: () =>
            navigator.clipboard.writeText(`[${pageNode.name}](${encodeURI(pageNode.path)})`).then(
              () => toast('Link copied', 'success'),
              () => toastError('Could not copy the link'),
            ),
        },
      ],
    },
    { items: [{ label: 'Delete', icon: Trash2, onSelect: () => setDeleting(pageNode) }] },
  ]

  return (
    <div className="flex h-screen flex-col text-sm print:block print:h-auto">
      {isTauri && <TitleBar title={page === '.trash' ? 'Trash' : page === '.all' ? 'All pages' : page === '.history' ? 'History' : page ? page.slice(page.lastIndexOf('/') + 1).replace(/\.(md|excalidraw)$/, '') : 'Notedflow'} />}
      <div className="flex min-h-0 flex-1 print:block">
        <div
          inert={!sidebar}
          className={`relative shrink-0 overflow-hidden border-neutral-200 print:hidden ${sidebar ? 'border-r' : ''} ${resizing ? '' : 'transition-[width] duration-200 ease-out'}`}
          style={{ width: sidebar ? width : 0 }}
        >
          <div className="h-full" style={{ width }}>
          <Sidebar
            root={root}
            createFromTemplate={setTemplateDir}
            saveTemplate={saveAsTemplate}
            print={() => print()}
            openToday={openToday}
            favorites={favorites}
            favoriteSet={favSet}
            toggleFavorite={(path) => updateFavs((f) => toggleFavorite(f, path))}
            stored={stored}
            loading={loading}
            tree={tree}
            page={page}
            go={go}
            create={create}
            move={move}
            remove={setDeleting}
            reopen={reopen}
            pickFolder={pickFolder}
            openSettings={() => setShowSettings(true)}
            openSearch={() => setShowSearch(true)}
            hide={toggleSidebar}
            git={isTauri && root ? <GitFooter mode={settings.mode} refreshKey={entries} flush={() => Promise.all([...flushes].map((f) => f()))} onPulled={pulled} onSaved={() => setHistoryRev((r) => r + 1)} openGraph={() => go('.history')} onSetup={() => setSetup(true)} /> : undefined}
          />
          </div>
          {sidebar && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize sidebar"
              aria-valuemin={220}
              aria-valuemax={400}
              aria-valuenow={width}
              tabIndex={0}
              title="Drag to resize, double-click to reset"
              className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize transition-colors duration-150 hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                setResizing(true)
              }}
              onPointerMove={(e) => resizing && setWidth(clampWidth(e.clientX))}
              onPointerUp={(e) => {
                setResizing(false)
                resizeSidebar(e.clientX)
              }}
              onDoubleClick={() => resizeSidebar(DEFAULT_WIDTH)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                  e.preventDefault()
                  resizeSidebar(width + (e.key === 'ArrowRight' ? 16 : -16))
                }
              }}
            />
          )}
        </div>
        {!sidebar && (
          <div className="print:hidden flex w-11 shrink-0 flex-col items-center gap-0.5 border-r border-neutral-200 bg-neutral-50 py-2.5">
            <button className={iconButton} title="Show sidebar (Ctrl+\)" aria-label="Show sidebar" onClick={toggleSidebar}>
              <PanelLeftOpen size={16} />
            </button>
            {root && (
              <button className={iconButton} title="Search (Ctrl+K)" aria-label="Search" onClick={() => setShowSearch(true)}>
                <Search size={16} />
              </button>
            )}
          </div>
        )}
        <div className="relative flex min-w-0 flex-1 print:block">
          <div className="flex min-w-0 flex-1 flex-col print:block">
            {root && barTitle !== undefined && (
              <TopBar
                page={barTitle ? undefined : page!}
                title={barTitle}
                exists={exists}
                icons={icons}
                mtime={entries.find((e) => e.path === page)?.mtime}
                favorite={page ? favSet.has(page) : false}
                toggleFavorite={page ? () => updateFavs((f) => toggleFavorite(f, page)) : undefined}
                menu={pageMenu}
                go={go}
                panel={tabs.length ? { open: panel, toggle: togglePanel } : undefined}
              />
            )}
            <main className="min-h-0 min-w-0 flex-1 overflow-auto print:overflow-visible">
          {root && preview ? (
            <VersionView vault={root} dark={dark} view={{ page: preview.page, hash: 'ai-preview', date: new Date().toISOString(), content: preview.content }} label={`Preview of the AI’s version of ${preview.page}`} backLabel="Close preview" onBack={() => setPreview(undefined)} />
          ) : root && view ? (
            <VersionView vault={root} dark={dark} view={view} onRestore={restoreVersion} onBack={() => setViewing(undefined)} />
          ) : root && page?.endsWith('.md') ? (
            <DocPage
              key={page + rev}
              vault={root}
              dark={dark}
              path={page}
              exists={exists}
              go={go}
              onRename={(name) => rename(page, name)}
              onIconChange={() => open(root)}
              onSave={(text) => setEntries((es) => es.map((e) => (e.path === page ? { ...e, text, mtime: Date.now(), links: linkTargets(e.path, text) } : e)))}
              onHeadings={setOutline}
              model={settings.model}
              openSettings={() => setShowSettings(true)}
              focusTitle={fresh === page}
              linkedFrom={linkedFrom}
            />
          ) : root && page?.endsWith('.excalidraw') ? (
            <BoardPage chatRef={boardChat} docTexts={docTexts} key={page + rev} vault={root} zoomTo={zoomTo} onSave={(boardTexts: BoardText[]) => setEntries((es) => es.map((e) => (e.path === page ? { ...e, boardTexts, mtime: Date.now() } : e)))} openSettings={() => setShowSettings(true)} path={page} dark={dark} model={settings.model} onSummary={(doc) => saveSummary(page, doc)} go={go} onRename={(name) => rename(page, name)} focusTitle={fresh === page} onIconChange={() => open(root)} />
          ) : root && page === '.history' && isTauri && settings.mode === 'advanced' ? (
            <GraphPage vault={root} dark={dark} refreshKey={historyRev} />
          ) : root && page === '.all' ? (
            <AllPagesPage entries={entries} go={go} favorites={favSet} toggleFavorite={(path) => updateFavs((f) => toggleFavorite(f, path))} />
          ) : root && page === '.trash' ? (
            <TrashPage vault={root} entries={entries} onChange={() => open(root)} />
          ) : loading ? null : root ? (
              <StartPage
                name={root.name || 'Notes'}
                entries={entries}
                favorites={favs.filter((p) => exists.has(p))}
                go={go}
                newDoc={() => create('', 'doc')}
                newBoard={() => create('', 'board')}
                openToday={openToday}
                fromTemplate={() => setTemplateDir('')}
              />
          ) : (
            <EmptyState
              icon={FolderOpen}
              title="Open your notes folder"
              actions={
                stored ? (
                  <>
                    <button className={primaryButton} onClick={reopen}>
                      Reopen “{stored.name}”
                    </button>
                    <button className={secondaryButton} onClick={pickFolder}>
                      Open another folder
                    </button>
                  </>
                ) : (
                  <button className={primaryButton} onClick={pickFolder}>
                    <FolderOpen size={16} /> Open folder
                  </button>
                )
              }
            >
              Notedflow keeps each page as a plain Markdown or Excalidraw file in a folder you choose, so git and your
              other editors can read them too.
            </EmptyState>
          )}
        </main>
          </div>
          {root && tabs.length > 0 && (
            <div
              inert={!panel}
              className={`shrink-0 overflow-hidden transition-[width] duration-200 ease-out print:hidden ${panel ? 'w-[300px]' : 'w-0'}`}
            >
              <RightPanel tabs={tabs} />
            </div>
          )}
        </div>
        {showSearch && root && (
          <SearchPalette
            index={index}
            icons={icons}
            recent={recent}
            go={go}
            onClose={() => setShowSearch(false)}
            actions={[
              { label: 'New doc', icon: FileText, run: () => create('', 'doc') },
              { label: 'New board', icon: Presentation, run: () => create('', 'board') },
              { label: 'Today', icon: CalendarDays, run: openToday },
              { label: 'All pages', icon: LayoutList, run: () => go('.all') },
              { label: 'Toggle theme', icon: dark ? Sun : Moon, run: () => changeSettings({ ...settings, theme: dark ? 'light' : 'dark' }) },
              { label: 'Toggle sidebar', icon: PanelLeftOpen, shortcut: 'Ctrl+\\', run: toggleSidebar },
              { label: 'Settings', icon: SettingsIcon, run: () => setShowSettings(true) },
              { label: 'Open another folder', icon: FolderOpen, run: pickFolder },
            ]}
          />
        )}
        {templateDir !== undefined && root && <TemplatePicker vault={root} onPick={(body) => createFromTemplate(templateDir, body)} onClose={() => setTemplateDir(undefined)} />}
        {deleting && (
          <Dialog aria-label={`Move ${deleting.name} to Trash`} onClose={() => setDeleting(undefined)}>
            <h2 className="font-semibold">Move “{deleting.name}” to Trash?</h2>
            <p className="mt-2 text-neutral-700">
              {!!deletingPages && `This also moves ${deletingPages} page${deletingPages > 1 ? 's' : ''} inside it. `}
              Restore it from Trash in the sidebar.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button autoFocus className={ghostButton} onClick={() => setDeleting(undefined)}>
                Cancel
              </button>
              <button className={dangerButton} onClick={() => remove(deleting)}>
                Move to Trash
              </button>
            </div>
          </Dialog>
        )}
        {replacing && (
          <Dialog aria-label="Replace template" onClose={() => setReplacing(undefined)}>
            <h2 className="font-semibold">Replace the template “{replacing.name}”?</h2>
            <p className="mt-2 text-neutral-700">A template with this name already exists. It will be overwritten with this page.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button autoFocus className={ghostButton} onClick={() => setReplacing(undefined)}>
                Cancel
              </button>
              <button
                className={primaryButton}
                onClick={() => {
                  const n = replacing
                  setReplacing(undefined)
                  saveAsTemplate(n, true)
                }}
              >
                Replace
              </button>
            </div>
          </Dialog>
        )}
        {setup && root && (
          <SetupWizard
            onClose={() => setSetup(false)}
            onChanged={() => {
              setHistoryRev((r) => r + 1)
              open(root)
            }}
          />
        )}
        {peek && root && (
          <PagePeek
            vault={root}
            path={peek}
            dark={dark}
            onClose={() => setPeek(undefined)}
            onOpen={() => go(peek)}
            doc={
              <DocPage
                key={peek + rev}
                vault={root}
                dark={dark}
                path={peek}
                exists={exists}
                go={go}
                onRename={(name) => rename(peek, name)}
                onIconChange={() => open(root)}
                onSave={(text) => setEntries((es) => es.map((e) => (e.path === peek ? { ...e, text, mtime: Date.now(), links: linkTargets(e.path, text) } : e)))}
                onHeadings={() => {}}
                model={settings.model}
                openSettings={() => setShowSettings(true)}
                focusTitle={false}
                linkedFrom={linksTo(peek)}
              />
            }
          />
        )}
        <Toasts />
        {showSettings && <SettingsDialog settings={settings} onChange={changeSettings} onClose={() => setShowSettings(false)} />}
      </div>
    </div>
  )
}
