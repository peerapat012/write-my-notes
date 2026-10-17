import { type LucideIcon, Search } from 'lucide-react'
import { type ReactNode, useId, useLayoutEffect, useRef, useState } from 'react'
import { panel, shortcut } from './ui'

export type MenuItem = { label: string; icon?: LucideIcon; shortcut?: string; onSelect: () => void }
export type MenuGroup = { label?: string; items: MenuItem[] }

type Props = {
  label: string
  groups: MenuGroup[]
  /** Opens as a light-dismiss popover next to this rect (top layer: never clipped). Without it, renders in place. */
  anchor?: DOMRect
  onClose?: () => void
  /** Search field at the top; on by default once the menu has more than 6 items. */
  searchable?: boolean
}

/** The one menu style (Notion's block menu): optional search, muted group labels, icon + label + shortcut rows. */
export default function Menu({ label, groups, anchor, onClose, searchable }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const q = query.trim().toLowerCase()
  const shown = groups.map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) })).filter((g) => g.items.length)
  const items = shown.flatMap((g) => g.items)
  const search = searchable ?? groups.flatMap((g) => g.items).length > 6

  useLayoutEffect(() => {
    const el = ref.current!
    if (anchor) {
      el.showPopover()
      // Below the anchor, flipped above or pulled left when it would leave the window.
      const { width, height } = el.getBoundingClientRect()
      const below = anchor.bottom + 4 + height <= innerHeight
      el.style.top = `${Math.max(8, below ? anchor.bottom + 4 : anchor.top - 4 - height)}px`
      el.style.left = `${Math.max(8, Math.min(anchor.left, innerWidth - width - 8))}px`
    }
    ;(el.querySelector('input') ?? el).focus()
  }, [anchor])

  function select(item: MenuItem) {
    if (anchor) ref.current!.hidePopover() // fires onToggle -> onClose
    else onClose?.()
    item.onSelect()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((a) => (a + step + items.length) % Math.max(items.length, 1))
    } else if (e.key === 'Enter' && items[active]) {
      e.preventDefault()
      select(items[active])
    } else if (e.key === 'Escape' && !anchor) onClose?.() // popovers close on Esc by themselves
  }

  let n = 0
  return (
    <div
      ref={ref}
      popover={anchor ? 'auto' : undefined}
      tabIndex={-1}
      aria-label={label}
      role={search ? undefined : 'menu'}
      aria-activedescendant={search || !items.length ? undefined : `${id}-${active}`}
      onToggle={(e) => (e as unknown as ToggleEvent).newState === 'closed' && onClose?.()}
      onKeyDown={onKeyDown}
      onClick={(e) => e.stopPropagation()} // React bubbles through the portal-less popover to the trigger's row
      className={`${panel} ${anchor ? 'fixed inset-auto m-0' : 'relative'} w-60 overflow-hidden p-0 outline-none transition-[opacity,translate] duration-150 ease-out starting:-translate-y-1 starting:opacity-0`}
    >
      {search && (
        <label className="flex items-center gap-2 border-b border-neutral-200 px-3">
          <Search size={14} className="shrink-0 text-neutral-400" />
          <input
            role="combobox"
            aria-expanded
            aria-controls={`${id}-list`}
            aria-activedescendant={items.length ? `${id}-${active}` : undefined}
            placeholder="Search actions…"
            className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
          />
        </label>
      )}
      <div id={`${id}-list`} role={search ? 'listbox' : undefined} className="max-h-[min(24rem,70vh)] overflow-auto p-1">
        {shown.map((g, gi) => (
          <div key={gi} role="group" aria-label={g.label} className={gi ? 'mt-1 border-t border-neutral-200 pt-1' : ''}>
            {g.label && <div className="px-2 pt-1.5 pb-1 text-xs font-medium text-neutral-500">{g.label}</div>}
            {g.items.map((item) => {
              const i = n++
              return (
                <MenuRow
                  key={item.label}
                  id={`${id}-${i}`}
                  role={search ? 'option' : 'menuitem'}
                  aria-selected={search ? i === active : undefined}
                  active={i === active}
                  icon={item.icon}
                  label={item.label}
                  hint={item.shortcut && <kbd className={shortcut}>{item.shortcut}</kbd>}
                  onMouseMove={() => setActive(i)}
                  onClick={() => select(item)}
                />
              )
            })}
          </div>
        ))}
        {!items.length && <div className="px-2 py-1.5 text-sm text-neutral-500">No results</div>}
      </div>
    </div>
  )
}

type RowProps = { active: boolean; icon?: LucideIcon; label: ReactNode; hint?: ReactNode; detail?: ReactNode } & Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children'
>

/** One menu row: icon, label, right-aligned hint, optional muted second line. Shared with the search palette. */
export function MenuRow({ active, icon: Icon, label, hint, detail, className = '', ...rest }: RowProps) {
  return (
    <div {...rest} className={`cursor-pointer rounded-md px-2 py-1.5 text-sm ${active ? 'bg-neutral-100' : ''} ${className}`}>
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && <Icon size={16} className={`shrink-0 ${active ? 'text-neutral-700' : 'text-neutral-500'}`} />}
        <span className="truncate">{label}</span>
        {hint}
      </div>
      {detail && <div className={`truncate text-xs text-neutral-500 ${Icon ? 'pl-[26px]' : ''}`}>{detail}</div>}
    </div>
  )
}

/** A trigger button that opens a Menu below itself. */
export function MenuButton({ label, groups, className, children }: { label: string; groups: MenuGroup[]; className?: string; children: ReactNode }) {
  const [anchor, setAnchor] = useState<DOMRect>()
  const button = useRef<HTMLButtonElement>(null)
  const closedAt = useRef(0)
  return (
    <>
      <button
        ref={button}
        type="button"
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        className={className}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          // A click on the trigger first light-dismisses the open menu; don't reopen it in the same gesture.
          if (performance.now() - closedAt.current > 200) setAnchor(e.currentTarget.getBoundingClientRect())
        }}
      >
        {children}
      </button>
      {anchor && (
        <Menu
          label={label}
          groups={groups}
          anchor={anchor}
          onClose={() => {
            closedAt.current = performance.now()
            setAnchor(undefined)
            if (document.activeElement === document.body) button.current?.focus() // Esc: back to the trigger
          }}
        />
      )}
    </>
  )
}
