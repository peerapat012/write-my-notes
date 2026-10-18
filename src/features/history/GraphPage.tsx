import { FileText, Loader2, Presentation } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import EmptyState from '@/components/EmptyState'
import { ghostButton } from '@/components/ui'
import type { Vault } from '@/lib/fs'
import { graphLog, gitState, showChanges, showFile } from '@/lib/git'
import { layout, parseChanges, parseGraph, type Commit, type FileChange, type Ref, type Row } from './graph'
import { versionDate } from './versionDate'
import VersionView, { type Viewing } from './VersionView'

const PAGE = 200
const ROW = 28 // row height; lanes of neighbouring rows meet at the edges
const LANE = 14 // lane spacing
const COLORS = ['#4c8bf5', '#e5734a', '#3fae6a', '#b06ad6', '#d4a72c', '#e0568f']

type Props = { vault: Vault; dark: boolean; refreshKey: unknown }
type Load = { kind: 'loading' } | { kind: 'unavailable'; message: string } | { kind: 'error'; message: string } | { kind: 'ok'; commits: Commit[]; more: boolean }

/** Advanced mode: every commit of the repo (all branches) with its lanes. Pick a commit, then a file to preview it read-only. */
export default function GraphPage({ vault, dark, refreshKey }: Props) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' })
  const [loadingMore, setLoadingMore] = useState(false)
  const [selected, setSelected] = useState<Commit>()
  const [files, setFiles] = useState<FileChange[] | string>() // a string is an error message
  const [preview, setPreview] = useState<Viewing>()
  const latest = useRef('') // the commit whose files were asked for last
  const ok = load.kind === 'ok' ? load : undefined
  const { rows, width } = useMemo(() => layout(ok?.commits ?? []), [ok])

  useEffect(() => {
    let stale = false
    ;(async (): Promise<Load> => {
      const state = await gitState()
      if (state.kind === 'no-git') return { kind: 'unavailable', message: 'Git is not installed.' }
      if (state.kind === 'no-repo') return { kind: 'unavailable', message: 'This folder is not a git repository.' }
      try {
        const commits = parseGraph(await graphLog(PAGE, 0))
        return { kind: 'ok', commits, more: commits.length === PAGE }
      } catch (e) {
        return /does not have any commits/.test(String(e)) ? { kind: 'ok', commits: [], more: false } : { kind: 'error', message: String(e) }
      }
    })().then((l) => !stale && setLoad(l))
    return () => void (stale = true)
  }, [refreshKey])

  async function more(current: Extract<Load, { kind: 'ok' }>) {
    setLoadingMore(true)
    try {
      const next = parseGraph(await graphLog(PAGE, current.commits.length))
      setLoad({ kind: 'ok', commits: [...current.commits, ...next], more: next.length === PAGE })
    } catch (e) {
      setLoad({ kind: 'error', message: String(e) })
    } finally {
      setLoadingMore(false)
    }
  }

  async function select(commit: Commit) {
    latest.current = commit.hash
    setSelected(commit)
    setFiles(undefined)
    try {
      const changes = parseChanges(await showChanges(commit.hash))
      if (latest.current === commit.hash) setFiles(changes)
    } catch (e) {
      if (latest.current === commit.hash) setFiles(String(e))
    }
  }

  async function open(commit: Commit, file: FileChange) {
    try {
      setPreview({ page: file.path, hash: commit.hash, date: commit.date, content: await showFile(commit.hash, file.path) })
    } catch (e) {
      alert(`Could not open this file: ${e}`)
    }
  }

  if (preview)
    return (
      <VersionView
        vault={vault}
        dark={dark}
        view={preview}
        label={`${preview.page} at ${preview.hash.slice(0, 7)} (${versionDate(preview.date)})`}
        backLabel="Back to history"
        onBack={() => setPreview(undefined)}
      />
    )
  if (load.kind === 'loading') return <p className="p-6 text-neutral-500">Loading history…</p>
  if (load.kind === 'unavailable') return <EmptyState icon={FileText} title="No history">{load.message}</EmptyState>
  if (load.kind === 'error')
    return (
      <p role="alert" className="p-6 text-danger">
        {load.message}
      </p>
    )
  if (!load.commits.length) return <EmptyState icon={FileText} title="Nothing saved yet">Commits will show up here.</EmptyState>

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <ul aria-label="Commits" className="min-w-[640px] pb-2">
          {rows.map((row) => (
            <li key={row.commit.hash}>
              <button
                aria-current={row.commit === selected ? 'true' : undefined}
                onClick={() => select(row.commit)}
                className={`flex w-full items-center gap-3 pr-4 pl-3 text-left transition-colors duration-150 ${row.commit === selected ? 'bg-accent-soft' : 'hover:bg-neutral-100'}`}
                style={{ height: ROW }}
              >
                <Lanes row={row} width={width} />
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {row.commit.refs.map((r) => (
                    <RefChip key={r.kind + r.name} r={r} />
                  ))}
                  <span className="truncate">{row.commit.message}</span>
                </span>
                <span className="w-28 shrink-0 truncate text-neutral-500">{row.commit.author}</span>
                <span className="w-36 shrink-0 text-neutral-500 tabular-nums">{versionDate(row.commit.date)}</span>
                <span className="w-16 shrink-0 font-mono text-xs text-neutral-500">{row.commit.hash.slice(0, 7)}</span>
              </button>
            </li>
          ))}
        </ul>
        {load.more && (
          <div className="flex justify-center pb-4">
            <button className={ghostButton} disabled={loadingMore} onClick={() => more(load)}>
              {loadingMore && <Loader2 size={14} className="animate-spin" />} Load more
            </button>
          </div>
        )}
      </div>
      {selected && (
        <section aria-label="Changed files" className="h-56 shrink-0 overflow-auto border-t border-neutral-200 bg-neutral-50 px-4 py-3">
          <h2 className="mb-2 truncate font-semibold">
            {selected.message} <span className="font-mono text-xs font-normal text-neutral-500">{selected.hash.slice(0, 7)}</span>
          </h2>
          {files === undefined ? (
            <p className="text-neutral-500">Loading…</p>
          ) : typeof files === 'string' ? (
            <p role="alert" className="text-danger">
              {files}
            </p>
          ) : (
            <ul>
              {files.map((f) => (
                <FileRow key={f.path} file={f} onOpen={() => open(selected, f)} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

const STATUS: Record<string, string> = { A: 'added', M: 'modified', D: 'deleted', R: 'renamed', C: 'copied', T: 'type changed' }

/** A changed file. Pages (docs and boards) that exist at the commit open; other files are listed only. */
function FileRow({ file, onOpen }: { file: FileChange; onOpen: () => void }) {
  const page = /\.(md|excalidraw)$/.test(file.path) && file.status !== 'D'
  const Icon = file.path.endsWith('.excalidraw') ? Presentation : FileText
  return (
    <li>
      <button disabled={!page} onClick={onOpen} className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left enabled:hover:bg-neutral-100 disabled:text-neutral-500">
        <Icon size={16} className="shrink-0 text-neutral-500" />
        <span className="min-w-0 flex-1 truncate" title={file.from ? `${file.from} → ${file.path}` : file.path}>
          {file.path}
        </span>
        <span className="text-xs text-neutral-500">{STATUS[file.status] ?? file.status}</span>
      </button>
    </li>
  )
}

const CHIP: Record<Ref['kind'], string> = {
  head: 'bg-accent text-on-accent',
  branch: 'bg-accent-soft text-accent',
  tag: 'bg-neutral-200 text-neutral-700',
}

function RefChip({ r }: { r: Ref }) {
  return <span className={`shrink-0 rounded px-1.5 text-xs leading-5 font-medium ${CHIP[r.kind]}`}>{r.name}</span>
}

/** The lane lines and the commit dot of one row. */
function Lanes({ row, width }: { row: Row; width: number }) {
  const x = (lane: number) => LANE / 2 + lane * LANE
  const mid = ROW / 2
  const color = (lane: number) => COLORS[lane % COLORS.length]
  const curve = (from: number, to: number, y0: number, y1: number, lane: number) => (
    <path key={`${from}-${to}-${y0}`} d={`M${x(from)} ${y0} C${x(from)} ${mid} ${x(to)} ${mid} ${x(to)} ${y1}`} stroke={color(lane)} fill="none" strokeWidth={2} />
  )
  return (
    <svg aria-hidden width={width * LANE} height={ROW} className="shrink-0">
      {row.passing.map((i) => (
        <line key={i} x1={x(i)} x2={x(i)} y1={0} y2={ROW} stroke={color(i)} strokeWidth={2} />
      ))}
      {row.top && <line x1={x(row.col)} x2={x(row.col)} y1={0} y2={mid} stroke={color(row.col)} strokeWidth={2} />}
      {row.bottom && <line x1={x(row.col)} x2={x(row.col)} y1={mid} y2={ROW} stroke={color(row.col)} strokeWidth={2} />}
      {row.joins.map((i) => curve(i, row.col, 0, mid, i))}
      {row.forks.map((i) => curve(row.col, i, mid, ROW, i))}
      <circle cx={x(row.col)} cy={mid} r={4} fill={color(row.col)} stroke="var(--color-white)" strokeWidth={1.5} />
    </svg>
  )
}
