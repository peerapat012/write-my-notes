import { FileText, FolderOpen, PanelLeftOpen, PanelRightOpen, Presentation, Search } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Dialog from '@/components/Dialog'
import TitleBar from '@/components/TitleBar'
import RightPanel from '@/components/RightPanel'
import EmptyState from '@/components/EmptyState'
import { INVALID } from '@/components/NameInput'
import { dangerButton, ghostButton, iconButton, input, primaryButton, secondaryButton } from '@/components/ui'
import BoardPage from '@/features/board/BoardPage'
import DocPage from '@/features/doc/DocPage'
import OutlineList from '@/features/doc/OutlineList'
import type { Heading } from '@/features/doc/outline'
import { dirty, flushes, isTauri, pickVault, restoreVault, type Stored, type Vault } from '@/lib/fs'
import { movedPath } from '@/lib/links'
import { ext, join, pageUrl, parentOf } from '@/lib/paths'
import SearchPalette from '@/features/search/SearchPalette'
import type { BoardText } from '@/features/search/boardText'
import type { SearchIndex } from '@/features/search/search'
import { loadSettings, saveSettings, type Settings } from '@/features/settings/settings'
import SettingsDialog from '@/features/settings/SettingsDialog'
import GitFooter from '@/features/git/GitFooter'
import HistoryTab from '@/features/history/HistoryTab'
import VersionView, { type Viewing } from '@/features/history/VersionView'
import { showFile, type Version } from '@/lib/git'
import GraphPage from '@/features/history/GraphPage'
import TrashPage from '@/features/trash/TrashPage'
import Sidebar from '@/features/sidebar/Sidebar'
import { buildTree, deletion, type Entry, type TreeNode } from '@/features/sidebar/tree'

const PAGE_PREFIX = import.meta.env.BASE_URL + 'page/' // '/page/' locally, '/write-my-notes/page/' on Pages
const currentPage = () =>
  location.pathname.startsWith(PAGE_PREFIX) ? decodeURIComponent(location.pathname.slice(PAGE_PREFIX.length)) : null

const SIDEBAR_KEY = 'write-my-notes:sidebar'
const PANEL_KEY = 'write-my-notes:panel'

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
  const index = useMemo<SearchIndex>(
    () => new Map(entries.filter((e) => /\.(md|excalidraw)$/.test(e.path)).map((e) => [e.path, e.boardTexts ?? e.text ?? ''])),
    [entries],
  )
  const [page, setPage] = useState(currentPage)
  const [zoomTo, setZoomTo] = useState<{ id: string }>() // board element a search hit asked to zoom to
  const [rev, setRev] = useState(0) // bumped after a move so the open page re-reads from disk
  const [settings, setSettings] = useState(() => loadSettings())
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [deleting, setDeleting] = useState<TreeNode>() // delete confirmation dialog
  const deletingPages = deleting && deletion(deleting).childPages
  const [naming, setNaming] = useState<{ dir: string; type: 'doc' | 'board' }>() // new-page name dialog
  const [loading, setLoading] = useState(true) // until the stored folder (if any) has been scanned
  const [sidebar, setSidebar] = useState(() => localStorage.getItem(SIDEBAR_KEY) !== 'hidden')
  const [panel, setPanel] = useState(() => localStorage.getItem(PANEL_KEY) === 'shown') // right panel, closed by default
  const [outline, setOutline] = useState<Heading[]>([])
  const [viewing, setViewing] = useState<Viewing>() // an old version shown read-only in place of the page
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
      alert(`Could not open this version: ${e}`)
    }
  }

  /** Writes the old content like any edit, then reloads the page from disk. */
  async function restoreVersion() {
    if (!root || !view) return
    try {
      await root.write(view.page, view.content)
    } catch (e) {
      return alert(`Could not restore: ${e}`)
    }
    setViewing(undefined)
    await open(root)
    setRev((r) => r + 1)
  }

  async function open(dir: Vault) {
    setRoot(dir)
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
    const onPop = () => setPage(currentPage())
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [])

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
      if ((e as Error).name !== 'AbortError') alert(`Could not open folder: ${e}`)
    }
  }

  async function reopen() {
    const dir = await stored?.reopen()
    if (dir) openFresh(dir)
  }

  function go(path: string, elementId?: string) {
    setZoomTo(elementId ? { id: elementId } : undefined)
    history.pushState(null, '', pageUrl(path))
    setPage(path)
  }

  async function move(from: string, to: string) {
    if (!root || from === to) return
    try {
      await Promise.all([...flushes].map((f) => f()))
      await root.move(from, to)
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

  /** Deletes a page with its child folder, or a plain folder. Leaves the open page first if it goes too. */
  async function remove(node: TreeNode) {
    setDeleting(undefined)
    if (!root) return
    const { paths } = deletion(node)
    const inside = (p: string) => paths.some((d) => p === d || p.startsWith(d + '/'))
    try {
      await Promise.all([...flushes].map((f) => f())) // so no pending autosave writes a deleted file back
      for (const p of [...dirty]) if (inside(p)) dirty.delete(p)
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
    } catch (e) {
      alert(`Could not move to Trash: ${e}`)
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
    ...(isTauri && page && /\.(md|excalidraw)$/.test(page)
      ? [{ id: 'history', label: 'History', content: <HistoryTab path={page} refreshKey={historyRev} viewing={view?.hash} onOpen={openVersion} /> }]
      : []),
  ]

  const rename = (from: string, name: string) => move(from, join(parentOf(from), name + ext(from)))

  // Asks for the name in a dialog (below), then creates the page and opens it.
  const create = (dir: string, type: 'doc' | 'board') => setNaming({ dir, type })

  async function createNamed(dir: string, type: 'doc' | 'board', name: string) {
    setNaming(undefined)
    if (!root || !name) return
    const path = await root.createPage(dir, name, type)
    await open(root)
    go(path)
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

  const newPage = (
    <>
      <button className={secondaryButton} onClick={() => create('', 'doc')}>
        <FileText size={16} /> New doc
      </button>
      <button className={secondaryButton} onClick={() => create('', 'board')}>
        <Presentation size={16} /> New board
      </button>
    </>
  )

  return (
    <div className="flex h-screen flex-col text-sm">
      {isTauri && <TitleBar title={page === '.trash' ? 'Trash' : page === '.history' ? 'History' : page ? page.slice(page.lastIndexOf('/') + 1).replace(/\.(md|excalidraw)$/, '') : 'Notedflow'} />}
      <div className="flex min-h-0 flex-1">
        {sidebar ? (
          <Sidebar
            root={root}
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
            git={isTauri && root ? <GitFooter mode={settings.mode} refreshKey={entries} flush={() => Promise.all([...flushes].map((f) => f()))} onPulled={pulled} onSaved={() => setHistoryRev((r) => r + 1)} openGraph={() => go('.history')} /> : undefined}
          />
        ) : (
          <div className="flex w-11 shrink-0 flex-col items-center gap-0.5 border-r border-neutral-200 bg-neutral-50 py-2.5">
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
        <div className="relative flex min-w-0 flex-1">
        <main className="min-w-0 flex-1 overflow-auto">
          {root && view ? (
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
              onSave={(text) => setEntries((es) => es.map((e) => (e.path === page ? { ...e, text } : e)))}
              onHeadings={setOutline}
              model={settings.model}
              openSettings={() => setShowSettings(true)}
            />
          ) : root && page?.endsWith('.excalidraw') ? (
            <BoardPage key={page + rev} vault={root} zoomTo={zoomTo} onSave={(boardTexts: BoardText[]) => setEntries((es) => es.map((e) => (e.path === page ? { ...e, boardTexts } : e)))} openSettings={() => setShowSettings(true)} path={page} dark={dark} model={settings.model} onSummary={(doc) => saveSummary(page, doc)} go={go} onRename={(name) => rename(page, name)} />
          ) : root && page === '.history' && isTauri && settings.mode === 'advanced' ? (
            <GraphPage vault={root} dark={dark} refreshKey={historyRev} />
          ) : root && page === '.trash' ? (
            <TrashPage vault={root} entries={entries} onChange={() => open(root)} />
          ) : loading ? null : root ? (
            <EmptyState icon={FileText} title="No page open" actions={newPage}>
              Pick a page in the sidebar, or press <kbd className="font-sans font-medium text-neutral-700">Ctrl+K</kbd> to search.
            </EmptyState>
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
        {root && tabs.length > 0 &&
          (panel ? (
            <RightPanel tabs={tabs} onClose={togglePanel} />
          ) : (
            <button className={`${iconButton} absolute top-2 right-4 z-10`} title="Show panel" aria-label="Show panel" onClick={togglePanel}>
              <PanelRightOpen size={16} />
            </button>
          ))}
        </div>
        {showSearch && root && <SearchPalette index={index} go={go} onClose={() => setShowSearch(false)} />}
        {naming && (
          <Dialog aria-label={`New ${naming.type}`} onClose={() => setNaming(undefined)}>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createNamed(naming.dir, naming.type, String(new FormData(e.currentTarget).get('name')).trim())
              }}
            >
              <h2 className="font-semibold">New {naming.type}</h2>
              <input
                name="name"
                autoFocus
                required
                aria-label="Page name"
                placeholder={naming.type === 'doc' ? 'Meeting notes' : 'Architecture sketch'}
                onInput={(e) => {
                  const bad = INVALID.test(e.currentTarget.value.trim())
                  e.currentTarget.setCustomValidity(bad ? 'A name can’t start with a dot or contain \\ / : * ? " < > |' : '')
                }}
                className={`${input} mt-3`}
              />
              {naming.dir && <p className="mt-1.5 truncate text-xs text-neutral-500">Inside {naming.dir}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" className={ghostButton} onClick={() => setNaming(undefined)}>
                  Cancel
                </button>
                <button className={primaryButton}>Create</button>
              </div>
            </form>
          </Dialog>
        )}
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
        {showSettings && <SettingsDialog settings={settings} onChange={changeSettings} onClose={() => setShowSettings(false)} />}
      </div>
    </div>
  )
}
