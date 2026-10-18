import { useSyncExternalStore } from 'react'

/** Whether the open doc has edits not yet on disk; the top bar shows Saving… / Saved from it. */
let saving = false
const listeners = new Set<() => void>()

export function setSaving(next: boolean) {
  if (next === saving) return
  saving = next
  listeners.forEach((l) => l())
}

export const useSaving = () => useSyncExternalStore((cb) => (listeners.add(cb), () => void listeners.delete(cb)), () => saving)
