import { FileText, Presentation, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import Dialog from '@/components/Dialog'
import EmptyState from '@/components/EmptyState'
import { dangerButton, ghostButton, secondaryButton, skeleton } from '@/components/ui'
import type { Vault } from '@/lib/fs'

type Props = { vault: Vault; entries: unknown; onChange: () => void } // entries: changes on every rescan, so the list reloads; onChange: the page tree changed, rescan it

/** Trashed pages with their original path; restore one, or empty the whole trash. */
export default function TrashPage({ vault, entries, onChange }: Props) {
  const [pages, setPages] = useState<string[]>()
  const [confirming, setConfirming] = useState(false)
  const reload = () => vault.listTrash().then(setPages)
  useEffect(() => void reload(), [vault, entries])

  async function restore(path: string) {
    try {
      await vault.restore(path)
      onChange()
    } catch (e) {
      alert(`Could not restore: ${e}`)
    }
    reload()
  }

  async function empty() {
    setConfirming(false)
    try {
      await vault.delete(['.trash'])
    } catch (e) {
      alert(`Could not empty trash: ${e}`)
    }
    reload()
  }

  if (!pages)
    return (
      <div aria-label="Loading trash" className="mx-auto max-w-3xl space-y-3 px-16 pt-16">
        {[60, 80, 50].map((w) => <div key={w} className={`${skeleton} h-8`} style={{ width: `${w}%` }} />)}
      </div>
    )
  if (!pages.length) return <EmptyState icon={Trash2} title="Trash is empty">Deleted pages wait here until you empty the trash.</EmptyState>
  return (
    <div className="mx-auto max-w-3xl px-16 pt-16 pb-32">
      <div className="mb-6 flex items-center">
        <h1 className="mr-auto text-[40px] leading-tight font-bold tracking-[-0.02em]">Trash</h1>
        <button className={secondaryButton} onClick={() => setConfirming(true)}>
          <Trash2 size={16} /> Empty trash
        </button>
      </div>
      <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
        {pages.map((p) => {
          const Icon = p.endsWith('.md') ? FileText : Presentation
          return (
            <li key={p} className="flex h-11 items-center gap-2">
              <Icon size={16} className="shrink-0 text-neutral-500" />
              <span className="min-w-0 flex-1 truncate" title={p}>
                {p.slice(p.lastIndexOf('/') + 1).replace(/\.(md|excalidraw)$/, '')}
                {p.includes('/') && <span className="ml-2 text-neutral-500">{p.slice(0, p.lastIndexOf('/'))}</span>}
              </span>
              <button className={ghostButton} onClick={() => restore(p)}>
                <RotateCcw size={16} /> Restore
              </button>
            </li>
          )
        })}
      </ul>
      {confirming && (
        <Dialog aria-label="Empty trash" onClose={() => setConfirming(false)}>
          <h2 className="font-semibold">Empty trash?</h2>
          <p className="mt-2 text-neutral-700">
            {pages.length} page{pages.length > 1 ? 's' : ''} and everything in the trash will be deleted from disk for good. Use git to get them back.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button autoFocus className={ghostButton} onClick={() => setConfirming(false)}>
              Cancel
            </button>
            <button className={dangerButton} onClick={empty}>
              Empty trash
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
