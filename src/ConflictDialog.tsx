/** Asks which version wins when a file with unsaved edits changed on disk. Esc keeps the user's edits. */
export default function ConflictDialog({ name, onAnswer }: { name: string; onAnswer: (loadDisk: boolean) => void }) {
  const btn = 'rounded px-3 py-1.5 font-medium'
  return (
    <dialog
      ref={(d) => void (d && !d.open && d.showModal())}
      onCancel={(e) => {
        e.preventDefault()
        onAnswer(false)
      }}
      className="m-auto max-w-sm rounded-lg p-5 text-sm shadow-xl backdrop:bg-black/20"
    >
      <h2 className="font-semibold">“{name}” changed on disk</h2>
      <p className="mt-1 text-neutral-600">You have unsaved edits. Keep yours and overwrite the file, or load the version on disk?</p>
      <div className="mt-4 flex justify-end gap-2">
        <button className={`${btn} hover:bg-neutral-100`} onClick={() => onAnswer(true)}>
          Load disk version
        </button>
        <button autoFocus className={`${btn} bg-neutral-900 text-white hover:bg-neutral-700`} onClick={() => onAnswer(false)}>
          Keep mine
        </button>
      </div>
    </dialog>
  )
}
