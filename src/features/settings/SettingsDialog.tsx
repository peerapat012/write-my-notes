import { GitBranch, Monitor, Moon, Palette, Sparkles, Sun, X } from 'lucide-react'
import { useState } from 'react'
import Dialog from '@/components/Dialog'
import { iconButton, input } from '@/components/ui'
import { isTauri } from '@/lib/fs'
import { DEFAULT_MODEL, type Mode, type Settings, type Theme } from './settings'

const THEMES = [
  ['light', Sun, 'Light'],
  ['dark', Moon, 'Dark'],
  ['system', Monitor, 'System'],
] as const

const MODES: [Mode, string][] = [
  ['simple', 'Simple'],
  ['advanced', 'Advanced'],
]

const SECTIONS = [
  ['appearance', Palette, 'Appearance'],
  ['ai', Sparkles, 'AI'],
  ...(isTauri ? ([['git', GitBranch, 'Git']] as const) : []),
] as const

const segment =
  'flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded text-neutral-500 transition-colors duration-150 hover:text-neutral-900 has-checked:bg-white has-checked:text-neutral-900 has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-accent'

type Props = { settings: Settings; onChange: (settings: Settings) => void; onClose: () => void }

/** Sections at the left (a tab row on narrow windows), the selected one at the right. Every change applies and saves at once. */
export default function SettingsDialog({ settings, onChange, onClose }: Props) {
  const [section, setSection] = useState<(typeof SECTIONS)[number][0]>('appearance')
  return (
    <Dialog aria-label="Settings" onClose={onClose} padded={false} className="m-auto w-[calc(100%-2rem)] max-w-[640px]">
      <div className="flex min-h-[360px] flex-col sm:flex-row">
        <nav aria-label="Settings sections" className="flex shrink-0 gap-1 border-b border-neutral-200 bg-neutral-50 p-2 sm:w-44 sm:flex-col sm:border-r sm:border-b-0">
          <h2 className="hidden px-2 pt-1 pb-2 text-xs font-medium text-neutral-500 sm:block">Settings</h2>
          {SECTIONS.map(([id, Icon, label]) => (
            <button
              key={id}
              aria-current={section === id ? 'page' : undefined}
              onClick={() => setSection(id)}
              className={`flex h-8 items-center gap-2 rounded-md px-2 text-left transition-colors duration-150 ${section === id ? 'bg-neutral-200 font-medium text-neutral-900' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              <Icon size={16} className="text-neutral-500" /> {label}
            </button>
          ))}
        </nav>
        <div className="relative min-w-0 flex-1 p-5">
          <button autoFocus className={`${iconButton} absolute top-3 right-3`} aria-label="Close settings" title="Close" onClick={onClose}>
            <X size={16} />
          </button>
          {section === 'appearance' && (
            <>
              <h3 className="font-semibold">Appearance</h3>
              <fieldset className="mt-4">
                <legend className="mb-1.5 text-neutral-500">Theme</legend>
                <div className="grid grid-cols-3 gap-1 rounded-md bg-neutral-100 p-1">
                  {THEMES.map(([value, Icon, label]) => (
                    <label key={value} className={segment}>
                      <input type="radio" name="theme" className="sr-only" checked={settings.theme === value} onChange={() => onChange({ ...settings, theme: value as Theme })} />
                      <Icon size={14} /> {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          {section === 'ai' && (
            <>
              <h3 className="font-semibold">AI</h3>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-neutral-500">Gemini model</span>
                <input className={input} value={settings.model} placeholder={`${DEFAULT_MODEL} (default)`} spellCheck={false} onChange={(e) => onChange({ ...settings, model: e.target.value })} />
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
                <span className="mt-1.5 block text-xs text-neutral-500">The key stays {isTauri ? 'on this computer' : 'in this browser'} and is sent only to Google.</span>
              </label>
            </>
          )}
          {section === 'git' && (
            <>
              <h3 className="font-semibold">Git</h3>
              <fieldset className="mt-4">
                <legend className="mb-1.5 text-neutral-500">Mode</legend>
                <div className="grid grid-cols-2 gap-1 rounded-md bg-neutral-100 p-1">
                  {MODES.map(([value, label]) => (
                    <label key={value} className={segment}>
                      <input type="radio" name="mode" className="sr-only" checked={settings.mode === value} onChange={() => onChange({ ...settings, mode: value })} />
                      {label}
                    </label>
                  ))}
                </div>
                <span className="mt-1.5 block text-xs text-neutral-500">Simple saves versions in plain words. Advanced uses git terms.</span>
              </fieldset>
            </>
          )}
        </div>
      </div>
    </Dialog>
  )
}
