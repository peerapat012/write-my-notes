import { Search, Trash2 } from 'lucide-react'
import { DynamicIcon } from 'lucide-react/dynamic'
import dynamicIconImports from 'lucide-react/dynamicIconImports'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ICON_COLORS, iconColorVar, LUCIDE_PREFIX } from '@/lib/icons'
import { ghostButton, panel } from './ui'

type Props = {
  anchor: DOMRect
  icon?: string
  color?: string
  /** A new icon (with its color for a Lucide one), or nothing to remove it. */
  onChange: (icon?: string, color?: string) => void
  onClose: () => void
}

const TABS = ['Emoji', 'Icons'] as const
const ALL = Object.keys(dynamicIconImports)
// Shown before the user searches.
const COMMON = 'file-text star heart bookmark flag folder home briefcase calendar clock lightbulb rocket target trophy zap flame leaf sun moon cloud music camera image book graduation-cap code terminal database globe map-pin mail phone message-circle users user settings wrench hammer shopping-cart gift coffee utensils plane car palette pencil'.split(' ')
const SHOWN = 96

/** Popover next to `anchor`: pick an emoji, or a Lucide icon with a color; Remove clears the icon. Emoji data ships with the app, so it works offline. */
export default function IconPicker({ anchor, icon, color, onChange, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<(typeof TABS)[number]>(icon?.startsWith(LUCIDE_PREFIX) ? 'Icons' : 'Emoji')

  useLayoutEffect(() => {
    const el = ref.current!
    el.showPopover()
    const { width, height } = el.getBoundingClientRect()
    const below = anchor.bottom + 4 + height <= innerHeight
    el.style.top = `${Math.max(8, below ? anchor.bottom + 4 : innerHeight - height - 8)}px`
    el.style.left = `${Math.max(8, Math.min(anchor.left, innerWidth - width - 8))}px`
  }, [anchor])

  /** Applies the choice and closes (fires onToggle -> onClose). */
  function pick(next?: string, nextColor?: string) {
    ref.current!.hidePopover()
    onChange(next, nextColor)
  }

  return (
    <div
      ref={ref}
      popover="auto"
      tabIndex={-1}
      aria-label="Page icon"
      onToggle={(e) => (e as unknown as ToggleEvent).newState === 'closed' && onClose()}
      onClick={(e) => e.stopPropagation()}
      className={`${panel} fixed inset-auto m-0 w-[352px] overflow-hidden p-0 outline-none transition-[opacity,translate] duration-150 ease-out starting:-translate-y-1 starting:opacity-0`}
    >
      <div className="flex items-center gap-1 border-b border-neutral-200 p-1.5">
        <div role="tablist" className="mr-auto flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={t === tab}
              onClick={() => setTab(t)}
              className={`h-7 rounded-md px-2.5 text-sm font-medium transition-colors duration-150 ${t === tab ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <button className={`${ghostButton} h-7 px-2`} disabled={!icon} onClick={() => pick()}>
          <Trash2 size={14} /> Remove
        </button>
      </div>
      {tab === 'Emoji' ? <EmojiTab onPick={(emoji) => pick(emoji)} /> : <IconsTab icon={icon} color={color} onPick={pick} />}
    </div>
  )
}

/** emoji-mart's picker (search, recents, categories), loaded on first use. Bundled data: no network. */
function EmojiTab({ onPick }: { onPick: (emoji: string) => void }) {
  const host = useRef<HTMLDivElement>(null)
  const pickRef = useRef(onPick)
  pickRef.current = onPick
  useLayoutEffect(() => {
    let picker: Node | undefined
    let gone = false
    Promise.all([import('emoji-mart'), import('@emoji-mart/data')]).then(([{ Picker }, data]) => {
      if (gone) return
      picker = new Picker({
        data: data.default,
        set: 'native',
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
        previewPosition: 'none',
        skinTonePosition: 'none',
        perLine: 9,
        autoFocus: true,
        onEmojiSelect: (e: { native: string }) => pickRef.current(e.native),
      }) as unknown as Node
      host.current!.append(picker)
    })
    return () => {
      gone = true
      picker?.parentNode?.removeChild(picker)
    }
  }, [])
  return <div ref={host} className="h-[22rem] [&>em-emoji-picker]:h-full [&>em-emoji-picker]:w-full" />
}

function IconsTab({ icon, color, onPick }: { icon?: string; color?: string; onPick: (icon: string, color: string) => void }) {
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState(color ?? 'gray')
  const q = query.trim().toLowerCase()
  const names = useMemo(() => (q ? ALL.filter((n) => n.includes(q)).slice(0, SHOWN) : COMMON.filter((n) => n in dynamicIconImports)), [q])
  const current = icon?.startsWith(LUCIDE_PREFIX) ? icon.slice(LUCIDE_PREFIX.length) : undefined
  return (
    <div>
      <label className="flex items-center gap-2 border-b border-neutral-200 px-3">
        <Search size={14} className="shrink-0 text-neutral-400" />
        <input
          autoFocus
          aria-label="Search icons"
          placeholder="Search icons…"
          className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div role="radiogroup" aria-label="Icon color" className="flex gap-1.5 px-3 py-2">
        {ICON_COLORS.map((c) => (
          <button
            key={c}
            role="radio"
            aria-checked={c === chosen}
            aria-label={c}
            title={c}
            onClick={() => {
              setChosen(c)
              if (current) onPick(icon!, c) // recolor the icon already chosen
            }}
            className={`size-5 rounded-full outline-offset-2 transition-shadow duration-150 ${c === chosen ? 'ring-2 ring-neutral-900 ring-offset-2 ring-offset-white' : 'hover:ring-2 hover:ring-neutral-300 hover:ring-offset-2 hover:ring-offset-white'}`}
            style={{ background: iconColorVar(c) }}
          />
        ))}
      </div>
      <div className="grid h-72 grid-cols-8 content-start gap-1 overflow-auto px-3 pb-3">
        {names.map((n) => (
          <button
            key={n}
            title={n}
            aria-label={n}
            aria-pressed={n === current}
            onClick={() => onPick(LUCIDE_PREFIX + n, chosen)}
            className={`grid size-9 place-items-center rounded-md transition-colors duration-150 ${n === current ? 'bg-accent-soft' : 'hover:bg-neutral-100'}`}
            style={{ color: iconColorVar(chosen) }}
          >
            <DynamicIcon name={n as never} size={18} strokeWidth={1.75} fallback={() => <span className="size-[18px]" />} />
          </button>
        ))}
        {!names.length && <p className="col-span-8 py-2 text-sm text-neutral-500">No icons match “{query.trim()}”</p>}
      </div>
    </div>
  )
}
