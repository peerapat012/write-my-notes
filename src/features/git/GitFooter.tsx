import { ArrowDownToLine, ArrowUpFromLine, GitCommitHorizontal, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import Dialog from '@/components/Dialog'
import { ghostButton, iconButton, input, primaryButton } from '@/components/ui'
import type { Mode } from '@/features/settings/settings'
import { autoMessage, COMMIT_FIRST, commitAll, gitState, pull, push, type GitState } from '@/lib/git'

type Props = {
  /** Simple: plain words and an optional message. Advanced: git terms and a required message. */
  mode: Mode
  /** Changes whenever pages change on disk or in the app; the status refreshes shortly after. */
  refreshKey: unknown
  /** Writes pending edits to disk, so a commit or pull sees them. */
  flush: () => Promise<unknown>
  /** After a successful pull: rescan the folder and reload the open page. */
  onPulled: () => Promise<unknown>
  /** After a version is saved or pulled: the page history changed. */
  onSaved: () => void
}

type Notice = { title: string; detail: string; terminal: boolean }

/** Desktop sidebar row: how many files changed in the notes folder's git repo, with Commit, Pull and Push. */
export default function GitFooter({ mode, refreshKey, flush, onPulled, onSaved }: Props) {
  const [state, setState] = useState<GitState>()
  const [committing, setCommitting] = useState(false)
  const [busy, setBusy] = useState<'pull' | 'push'>()
  const [notice, setNotice] = useState<Notice>()
  const simple = mode === 'simple'
  const refresh = () => gitState().then(setState)

  // Debounced after saves, moves and rescans; the first check runs at once.
  useEffect(() => {
    const t = setTimeout(refresh, state ? 800 : 0)
    return () => clearTimeout(t)
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    addEventListener('focus', refresh)
    return () => removeEventListener('focus', refresh)
  }, [])

  async function sync(what: 'pull' | 'push') {
    setBusy(what)
    try {
      if (what === 'pull') await flush()
      const failure = await (what === 'pull' ? pull() : push()).catch(String)
      if (failure === COMMIT_FIRST)
        setNotice(
          simple
            ? { title: 'Save a version first', detail: 'Getting updates needs your changes saved as a version first.', terminal: false }
            : { title: COMMIT_FIRST, detail: 'Pull needs a clean working tree. Commit your changes first.', terminal: false },
        )
      else if (failure) setNotice({ title: simple ? `Could not ${what === 'pull' ? 'get' : 'send'} updates` : `Git ${what} failed`, detail: failure, terminal: true })
      else if (what === 'pull') {
        await onPulled()
        onSaved()
      }
    } finally {
      setBusy(undefined)
      refresh()
    }
  }

  if (!state) return null
  const row = 'flex min-h-7 items-center gap-2 px-2 text-neutral-700'
  const icon = <GitCommitHorizontal size={16} className="shrink-0 text-neutral-500" />
  if (state.kind !== 'ok') {
    const message = state.kind === 'no-git' ? 'Git is not installed' : state.kind === 'no-repo' ? 'Not a git repository' : state.message
    return (
      <p className={`${row} text-neutral-500`} title={message}>
        {icon}
        <span className="truncate">{message}</span>
      </p>
    )
  }
  const n = state.changes.length
  const syncButton = (what: 'pull' | 'push', Icon: typeof ArrowDownToLine, label: string) => (
    <button className={iconButton} title={label} aria-label={label} disabled={!!busy} onClick={() => sync(what)}>
      {busy === what ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
    </button>
  )
  return (
    <>
      <div className={row}>
        {icon}
        <span className="mr-auto truncate tabular-nums">{n ? `${n} changed` : 'No changes'}</span>
        <button className={`${ghostButton} h-6 px-2`} disabled={!n || !!busy} onClick={() => setCommitting(true)}>
          {simple ? 'Save version' : 'Commit'}
        </button>
        {syncButton('pull', ArrowDownToLine, simple ? 'Get updates' : 'Pull')}
        {syncButton('push', ArrowUpFromLine, simple ? 'Send updates' : 'Push')}
      </div>
      {committing && (
        <CommitDialog
          simple={simple}
          count={n}
          flush={flush}
          onSaved={onSaved}
          onClose={() => {
            setCommitting(false)
            refresh()
          }}
        />
      )}
      {notice && (
        <Dialog aria-label={notice.title} onClose={() => setNotice(undefined)}>
          <h2 className="font-semibold">{notice.title}</h2>
          {notice.terminal ? (
            <>
              <pre role="alert" className="mt-2 max-h-48 overflow-auto font-sans text-[13px] whitespace-pre-wrap text-danger">
                {notice.detail}
              </pre>
              <p className="mt-2 text-neutral-700">Resolve in a terminal.</p>
            </>
          ) : (
            <p className="mt-2 text-neutral-700">{notice.detail}</p>
          )}
          <div className="mt-5 flex justify-end">
            <button autoFocus className={primaryButton} onClick={() => setNotice(undefined)}>
              OK
            </button>
          </div>
        </Dialog>
      )}
    </>
  )
}

function CommitDialog({ simple, count, flush, onSaved, onClose }: { simple: boolean; count: number; flush: () => Promise<unknown>; onSaved: () => void; onClose: () => void }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function commit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    await flush()
    const failure = await commitAll(message.trim() || autoMessage(count)).catch(String)
    setBusy(false)
    if (failure) setError(failure)
    else {
      onSaved()
      onClose()
    }
  }

  return (
    <Dialog aria-label={simple ? 'Save version' : 'Commit changes'} onClose={onClose}>
      <form onSubmit={commit}>
        <h2 className="font-semibold">{simple ? 'Save version' : 'Commit changes'}</h2>
        <p className="mt-1 text-neutral-700">
          {simple ? 'Saves' : 'Commits'} all {count} changed {count === 1 ? 'file' : 'files'}.
        </p>
        <input
          autoFocus
          required={!simple}
          aria-label={simple ? 'Note' : 'Commit message'}
          placeholder={simple ? `Add a note (optional): ${autoMessage(count)}` : 'What changed?'}
          className={`${input} mt-3`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {error && (
          <div role="alert" className="mt-3 text-danger">
            <pre className="max-h-40 overflow-auto font-sans text-[13px] whitespace-pre-wrap">{error}</pre>
            <p className="mt-1">Resolve in a terminal.</p>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={ghostButton} onClick={onClose}>
            Cancel
          </button>
          <button className={primaryButton} disabled={busy || (!simple && !message.trim())}>
            {busy && <Loader2 size={14} className="animate-spin" />} {simple ? 'Save' : 'Commit'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
