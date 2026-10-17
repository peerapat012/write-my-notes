import { useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react'
import BoardPage from '@/features/board/BoardPage'
import DocPage from '@/features/doc/DocPage'
import { createPage, flushes, listEntries, loadRoot, movePage, saveRoot } from '@/lib/fs'
import { movedPath } from '@/lib/links'
import { ext, join, pageUrl, parentOf } from '@/lib/paths'
import SearchPalette from '@/features/search/SearchPalette'
import type { SearchIndex } from '@/features/search/search'
import { loadSettings, saveSettings, type Settings } from '@/features/settings/settings'
import SettingsDialog from '@/features/settings/SettingsDialog'
import Sidebar from '@/features/sidebar/Sidebar'
import { buildTree, type Entry } from '@/features/sidebar/tree'

const currentPage = () =>
  location.pathname.startsWith('/page/') ? decodeURIComponent(location.pathname.slice('/page/'.length)) : null

const darkQuery = matchMedia('(prefers-color-scheme: dark)')
const subscribeDark = (cb: () => void) => {
  darkQuery.addEventListener('change', cb)
  return () => darkQuery.removeEventListener('change', cb)
}

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
  const [settings, setSettings] = useState(() => loadSettings())
  const [showSettings, setShowSettings] = useState(false)
  const systemDark = useSyncExternalStore(subscribeDark, () => darkQuery.matches)
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && systemDark)
  useLayoutEffect(() => void document.documentElement.classList.toggle('dark', dark), [dark]) // before paint: no light flash

  function changeSettings(next: Settings) {
    setSettings(next)
    saveSettings(next)
  }

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
      <Sidebar
        root={root}
        stored={stored}
        tree={tree}
        page={page}
        go={go}
        create={create}
        move={move}
        reopen={reopen}
        pickFolder={pickFolder}
        openSettings={() => setShowSettings(true)}
      />
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
          <BoardPage key={page + rev} root={root} path={page} dark={dark} go={go} onRename={(name) => rename(page, name)} />
        ) : (
          <div className="p-8 text-neutral-500">{page ?? 'No page selected'}</div>
        )}
      </main>
      {root && <SearchPalette index={index} go={go} />}
      {showSettings && <SettingsDialog settings={settings} onChange={changeSettings} onClose={() => setShowSettings(false)} />}
    </div>
  )
}
