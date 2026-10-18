import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ghostButton, secondaryButton } from '@/components/ui'
import { versionDate } from './versionDate'
import { fileLog, gitState, parseVersions, type Version } from '@/lib/git'

const PAGE = 50


type Props = {
  path: string
  /** Changes after versions are saved or pulled, so the list reloads. */
  refreshKey: unknown
  /** Hash of the version shown in the page area, if any. */
  viewing?: string
  onOpen: (version: Version) => void
  /** Git is missing or the folder is not a repo: opens the setup wizard. */
  onSetup: () => void
}

type Load = { kind: 'loading' } | { kind: 'unavailable'; message: string } | { kind: 'error'; message: string } | { kind: 'ok'; versions: Version[]; more: boolean }

/** Right panel tab (desktop): the versions of the open page, newest first. */
export default function HistoryTab({ path, refreshKey, viewing, onOpen, onSetup }: Props) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' })
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    let stale = false
    ;(async (): Promise<Load> => {
      const state = await gitState()
      if (state.kind === 'no-git') return { kind: 'unavailable', message: 'Git is not installed.' }
      if (state.kind === 'no-repo') return { kind: 'unavailable', message: 'This folder has no history yet.' }
      try {
        const versions = parseVersions(await fileLog(path, PAGE, 0), path)
        return { kind: 'ok', versions, more: versions.length === PAGE }
      } catch (e) {
        // A fresh repo with nothing saved yet has no history to show.
        return /does not have any commits/.test(String(e)) ? { kind: 'ok', versions: [], more: false } : { kind: 'error', message: String(e) }
      }
    })().then((l) => !stale && setLoad(l))
    return () => void (stale = true)
  }, [path, refreshKey])

  async function more(current: Extract<Load, { kind: 'ok' }>) {
    setLoadingMore(true)
    try {
      const next = parseVersions(await fileLog(path, PAGE, current.versions.length), current.versions.at(-1)?.path ?? path)
      setLoad({ kind: 'ok', versions: [...current.versions, ...next], more: next.length === PAGE })
    } catch (e) {
      setLoad({ kind: 'error', message: String(e) })
    } finally {
      setLoadingMore(false)
    }
  }

  const note = 'px-2 py-1 text-neutral-500'
  if (load.kind === 'loading') return <p className={note}>Loading…</p>
  if (load.kind === 'unavailable')
    return (
      <div className="px-2 py-1">
        <p className="text-neutral-500">{load.message}</p>
        <button className={`${secondaryButton} mt-2`} onClick={onSetup}>
          Set up history
        </button>
      </div>
    )
  if (load.kind === 'error')
    return (
      <p role="alert" className="px-2 py-1 text-danger">
        {load.message}
      </p>
    )
  if (!load.versions.length) return <p className={note}>No saved versions of this page yet.</p>
  return (
    <>
      <ul aria-label="Versions">
        {load.versions.map((v) => (
          <li key={v.hash}>
            <button
              aria-current={v.hash === viewing ? 'true' : undefined}
              title={`${versionDate(v.date)}\n${v.message}`}
              onClick={() => onOpen(v)}
              className={`block w-full rounded-md px-2 py-1.5 text-left transition-colors duration-150 ${v.hash === viewing ? 'bg-accent-soft text-accent' : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'}`}
            >
              <span className="block text-xs text-neutral-500 tabular-nums">{versionDate(v.date)}</span>
              <span className="block truncate">{v.message || 'No message'}</span>
            </button>
          </li>
        ))}
      </ul>
      {load.more && (
        <button className={`${ghostButton} mt-1 w-full`} disabled={loadingMore} onClick={() => more(load)}>
          {loadingMore && <Loader2 size={14} className="animate-spin" />} Load more
        </button>
      )}
    </>
  )
}
