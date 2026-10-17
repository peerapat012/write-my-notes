import { Monitor, Moon, Sun } from 'lucide-react'
import Dialog from '@/components/Dialog'
import { input, primaryButton } from '@/components/ui'
import { DEFAULT_MODEL, type Settings, type Theme } from './settings'

const THEMES = [
  ['light', Sun, 'Light'],
  ['dark', Moon, 'Dark'],
  ['system', Monitor, 'System'],
] as const

type Props = { settings: Settings; onChange: (settings: Settings) => void; onClose: () => void }

/** Theme, Gemini model name and API key. Every change applies and saves immediately. */
export default function SettingsDialog({ settings, onChange, onClose }: Props) {
  return (
    <Dialog aria-label="Settings" onClose={onClose}>
      <h2 className="font-semibold">Settings</h2>
      <fieldset className="mt-4">
        <legend className="mb-1.5 text-neutral-500">Theme</legend>
        <div className="grid grid-cols-3 gap-1 rounded-md bg-neutral-100 p-1">
          {THEMES.map(([value, Icon, label]) => (
            <label
              key={value}
              className="flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded text-neutral-500 transition-colors duration-150 hover:text-neutral-900 has-checked:bg-white has-checked:text-neutral-900 has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-accent"
            >
              <input
                type="radio"
                name="theme"
                className="sr-only"
                checked={settings.theme === value}
                onChange={() => onChange({ ...settings, theme: value as Theme })}
              />
              <Icon size={14} /> {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-neutral-500">Gemini model</span>
        <input
          className={input}
          value={settings.model}
          placeholder={`${DEFAULT_MODEL} (default)`}
          spellCheck={false}
          onChange={(e) => onChange({ ...settings, model: e.target.value })}
        />
      </label>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-neutral-500">Gemini API key</span>
        <input
          type="password"
          autoComplete="off"
          className={input}
          value={settings.key}
          placeholder="Paste your key"
          spellCheck={false}
          onChange={(e) => onChange({ ...settings, key: e.target.value })}
        />
        <span className="mt-1.5 block text-xs text-neutral-500">The key stays in this browser and is sent only to Google.</span>
      </label>
      <div className="mt-5 flex justify-end">
        <button autoFocus className={primaryButton} onClick={onClose}>
          Done
        </button>
      </div>
    </Dialog>
  )
}
