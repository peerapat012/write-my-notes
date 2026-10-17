import { Monitor, Moon, Sun } from 'lucide-react'
import { DEFAULT_MODEL, type Settings, type Theme } from './settings'

const THEMES = [
  ['light', Sun, 'Light'],
  ['dark', Moon, 'Dark'],
  ['system', Monitor, 'System'],
] as const

type Props = { settings: Settings; onChange: (settings: Settings) => void; onClose: () => void }

/** Theme and Gemini model name. Every change applies and saves immediately. */
export default function SettingsDialog({ settings, onChange, onClose }: Props) {
  return (
    <dialog
      ref={(d) => void (d && !d.open && d.showModal())}
      aria-label="Settings"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-auto w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-5 text-sm text-neutral-900 shadow-xl backdrop:bg-black/40"
    >
      <h2 className="font-semibold">Settings</h2>
      <fieldset className="mt-4">
        <legend className="mb-1.5 text-neutral-600">Theme</legend>
        <div className="grid grid-cols-3 gap-1 rounded-md bg-neutral-100 p-1">
          {THEMES.map(([value, Icon, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded px-2 py-1.5 has-checked:bg-white has-checked:shadow-sm has-focus-visible:outline-2"
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
        <span className="mb-1.5 block text-neutral-600">Gemini model</span>
        <input
          className="w-full rounded border border-neutral-300 bg-transparent px-2 py-1.5"
          value={settings.model}
          placeholder={DEFAULT_MODEL}
          spellCheck={false}
          onChange={(e) => onChange({ ...settings, model: e.target.value })}
        />
      </label>
      <div className="mt-5 flex justify-end">
        <button autoFocus className="rounded bg-neutral-900 px-3 py-1.5 font-medium text-white hover:bg-neutral-700" onClick={onClose}>
          Done
        </button>
      </div>
    </dialog>
  )
}
