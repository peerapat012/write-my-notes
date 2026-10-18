import { toastError } from '@/lib/toast'
import { FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import Dialog from '@/components/Dialog'
import { ghostButton } from '@/components/ui'
import type { Vault } from '@/lib/fs'
import { BUILT_IN } from './templates'

type Props = {
  vault: Vault
  /** The chosen template's body (before `created` and `{{date}}` are filled in). */
  onPick: (body: string) => void
  onClose: () => void
}

/** Built-in templates first, then the user's `.templates/` docs. */
export default function TemplatePicker({ vault, onPick, onClose }: Props) {
  const [mine, setMine] = useState<string[]>()
  useEffect(() => void vault.listTemplates().then(setMine, () => setMine([])), [vault])

  async function pickMine(name: string) {
    try {
      onPick(await vault.read(`.templates/${name}.md`))
    } catch (e) {
      toastError(`Could not read the template: ${e}`)
    }
  }

  const row = 'flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left transition-colors duration-150 hover:bg-neutral-100'
  return (
    <Dialog aria-label="Choose a template" onClose={onClose}>
      <h2 className="font-semibold">Choose a template</h2>
      <div className="mt-3 max-h-80 overflow-auto">
        <div className="px-2 pb-1 text-xs font-medium text-neutral-500">Built in</div>
        {BUILT_IN.map((t) => (
          <button key={t.name} className={row} onClick={() => onPick(t.body)}>
            <FileText size={16} className="shrink-0 text-neutral-500" /> {t.name}
          </button>
        ))}
        <div className="px-2 pt-3 pb-1 text-xs font-medium text-neutral-500">Yours</div>
        {mine?.map((name) => (
          <button key={name} className={row} onClick={() => pickMine(name)}>
            <FileText size={16} className="shrink-0 text-neutral-500" /> <span className="truncate">{name}</span>
          </button>
        ))}
        {mine && !mine.length && <p className="px-2 py-1 text-neutral-500">None yet. Use Save as template in a doc’s menu.</p>}
      </div>
      <div className="mt-4 flex justify-end">
        <button className={ghostButton} onClick={onClose}>
          Cancel
        </button>
      </div>
    </Dialog>
  )
}
