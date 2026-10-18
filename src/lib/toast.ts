import { useSyncExternalStore } from 'react'

export type Kind = 'info' | 'success' | 'error'
export type Toast = { id: number; kind: Kind; text: string; action?: { label: string; run: () => void } }

let toasts: Toast[] = []
let nextId = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const dismissToast = (id: number) => {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

/** Shows a toast; info and success close after 5 s, an error stays until closed. */
export function toast(text: string, kind: Kind = 'info', action?: Toast['action']) {
  toasts = [...toasts, { id: nextId++, kind, text, action }]
  emit()
}
export const toastError = (text: string) => toast(text, 'error')

export const useToasts = () => useSyncExternalStore((cb) => (listeners.add(cb), () => void listeners.delete(cb)), () => toasts)
