import { invoke } from '@tauri-apps/api/core'
import { ExternalLink, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import Dialog from '@/components/Dialog'
import { ghostButton, input, primaryButton } from '@/components/ui'
import { connectRemote, gitState, originUrl, setupStep, turnOnHistory, type SetupStep } from '@/lib/git'

type Props = {
  onClose: () => void
  /** History or the remote changed: rescan git status. */
  onChanged: () => void
}

/** Steps that are not done yet, one at a time: install Git, turn on history, connect GitHub (optional). */
export default function SetupWizard({ onClose, onChanged }: Props) {
  const [step, setStep] = useState<SetupStep>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [url, setUrl] = useState('')

  async function detect() {
    const s = await gitState()
    const isRepo = s.kind === 'ok' || s.kind === 'error'
    setStep(setupStep(s.kind !== 'no-git', isRepo, isRepo && !!(await originUrl())))
  }
  useEffect(() => void detect(), [])

  /** Runs one step's action; on failure stays on the step and shows git's message. */
  async function run(action: () => Promise<unknown>, then: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await action()
      await then()
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const title = { git: 'Install Git', init: 'Turn on history', remote: 'Back up to GitHub', done: 'History is on' }[step ?? 'done']
  return (
    <Dialog aria-label="Set up history" onClose={onClose} className="m-auto w-full max-w-md">
      <h2 className="font-semibold">{step ? title : 'Set up history'}</h2>
      {step === undefined && <p className="mt-2 text-neutral-500">Checking…</p>}
      {step === 'git' && (
        <>
          <p className="mt-2 text-neutral-700">History needs Git for Windows, which is not installed (or not on your PATH). Install it, then check again.</p>
          <button className={`${ghostButton} mt-3`} onClick={() => invoke('open_git_download').catch((e) => setError(String(e)))}>
            <ExternalLink size={16} /> Download Git
          </button>
        </>
      )}
      {step === 'init' && <p className="mt-2 text-neutral-700">This folder has no history yet. Turning it on saves everything in it as the first version, and from then on you can look back at older versions of a page.</p>}
      {step === 'remote' && (
        <>
          <p className="mt-2 text-neutral-700">Optional: keep a copy on GitHub. You can skip this and keep history on this computer only.</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-neutral-700">
            <li>On github.com, choose New repository. Leave it empty: no README.</li>
            <li>Copy the repository URL from its page, for example https://github.com/you/notes.git.</li>
            <li>Paste it here. GitHub asks you to sign in the first time.</li>
          </ol>
          <input
            autoFocus
            aria-label="GitHub repository URL"
            placeholder="https://github.com/you/notes.git"
            spellCheck={false}
            className={`${input} mt-3`}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </>
      )}
      {step === 'done' && <p className="mt-2 text-neutral-700">Everything is set up.</p>}
      {error && (
        <div role="alert" className="mt-3 text-danger">
          <pre className="max-h-40 overflow-auto font-sans text-[13px] whitespace-pre-wrap">{error}</pre>
          {step !== 'git' && <p className="mt-1">Resolve in a terminal.</p>}
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        {step === 'git' && (
          <button className={primaryButton} disabled={busy} onClick={() => run(async () => {}, detect)}>
            Check again
          </button>
        )}
        {step === 'init' && (
          <button className={primaryButton} disabled={busy} onClick={() => run(turnOnHistory, detect)}>
            {busy && <Loader2 size={14} className="animate-spin" />} Turn on history
          </button>
        )}
        {step === 'remote' && (
          <>
            <button className={ghostButton} disabled={busy} onClick={onClose}>
              Skip
            </button>
            <button className={primaryButton} disabled={busy || !url.trim()} onClick={() => run(() => connectRemote(url.trim()), detect)}>
              {busy && <Loader2 size={14} className="animate-spin" />} Connect
            </button>
          </>
        )}
        {step === 'done' && (
          <button autoFocus className={primaryButton} onClick={onClose}>
            Done
          </button>
        )}
        {step !== 'remote' && step !== 'done' && (
          <button className={ghostButton} onClick={onClose}>
            Cancel
          </button>
        )}
      </div>
    </Dialog>
  )
}
