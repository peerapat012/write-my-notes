export type Theme = 'light' | 'dark' | 'system'
export type Settings = { theme: Theme; model: string }

export const DEFAULT_MODEL = 'gemini-3.6-flash'
const KEY = 'write-my-notes:settings'

/** Settings from `localStorage`, with defaults for anything missing or invalid. */
export function loadSettings(storage: Pick<Storage, 'getItem'> = localStorage): Settings {
  let saved: Partial<Settings> = {}
  try {
    saved = JSON.parse(storage.getItem(KEY) ?? '{}')
  } catch {
    // corrupt value: fall back to defaults
  }
  return {
    theme: ['light', 'dark', 'system'].includes(saved.theme!) ? saved.theme! : 'system',
    model: (typeof saved.model === 'string' && saved.model.trim()) || DEFAULT_MODEL,
  }
}

export const saveSettings = (settings: Settings, storage: Pick<Storage, 'setItem'> = localStorage) =>
  storage.setItem(KEY, JSON.stringify(settings))
