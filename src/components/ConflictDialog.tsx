import Dialog from './Dialog'
import { primaryButton, secondaryButton } from './ui'

/** Asks which version wins when a file with unsaved edits changed on disk. Esc keeps the user's edits. */
export default function ConflictDialog({ name, onAnswer }: { name: string; onAnswer: (loadDisk: boolean) => void }) {
  return (
    <Dialog
      aria-label="File changed on disk"
      onCancel={(e) => {
        e.preventDefault()
        onAnswer(false)
      }}
    >
      <h2 className="font-semibold">“{name}” changed on disk</h2>
      <p className="mt-1.5 text-neutral-500">You have unsaved edits. Keep yours and overwrite the file, or load the version on disk?</p>
      <div className="mt-5 flex justify-end gap-2">
        <button className={secondaryButton} onClick={() => onAnswer(true)}>
          Load disk version
        </button>
        <button autoFocus className={primaryButton} onClick={() => onAnswer(false)}>
          Keep mine
        </button>
      </div>
    </Dialog>
  )
}
