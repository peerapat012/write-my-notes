import { ChevronRight, FileText, Folder, MoreHorizontal, PanelRightClose, PanelRightOpen, Presentation, Star } from 'lucide-react'
import { Fragment, useEffect, useState } from 'react'
import { relativeTime } from '@/features/allpages/allPages'
import { useSaving } from '@/lib/saveStatus'
import { MenuButton, type MenuGroup } from './Menu'
import PageIcon from './PageIcon'
import { iconButton } from './ui'

type Props = {
  /** A doc or board path: shows the breadcrumb, status, star and page menu. */
  page?: string
  /** Shown in place of the breadcrumb (Trash, All pages, history, version view). */
  title?: string
  exists: Set<string>
  icons: Map<string, { icon?: string; iconColor?: string }>
  mtime?: number
  favorite?: boolean
  toggleFavorite?: () => void
  menu?: MenuGroup[]
  go: (path: string) => void
  panel?: { open: boolean; toggle: () => void }
}

const crumb = 'flex h-7 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-neutral-500 transition-colors duration-150'

/** 40px bar above the page: breadcrumb at the left; save status, star, page menu and panel toggle at the right. */
export default function TopBar({ page, title, exists, icons, mtime, favorite, toggleFavorite, menu, go, panel }: Props) {
  const saving = useSaving()
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000) // keeps "Edited 2 min ago" current
    return () => clearInterval(timer)
  }, [])

  const parts = page ? page.split('/') : []
  const dirs = parts.slice(0, -1).map((name, i) => ({ name, path: parts.slice(0, i + 1).join('/') }))
  const folderPage = (dir: string) => [dir + '.md', dir + '.excalidraw'].find((p) => exists.has(p))
  // A long path keeps the first and last folder; the middle collapses into a … menu.
  const hidden = dirs.length > 3 ? dirs.slice(1, -1) : []
  const shownDirs = hidden.length ? [dirs[0], undefined, dirs[dirs.length - 1]] : dirs
  const name = parts.at(-1)?.replace(/\.(md|excalidraw)$/, '')
  const icon = page ? icons.get(page) : undefined
  const status = saving ? 'Saving…' : mtime && now - mtime < 60_000 ? 'Saved' : mtime ? `Edited ${relativeTime(mtime, now)}` : ''

  const folder = (d: { name: string; path: string }) => {
    const target = folderPage(d.path)
    return target ? (
      <button className={`${crumb} hover:bg-neutral-100 hover:text-neutral-900`} onClick={() => go(target)}>
        <span className="truncate">{d.name}</span>
      </button>
    ) : (
      <span className={crumb}>
        <span className="truncate">{d.name}</span>
      </span>
    )
  }

  return (
    <header className="flex h-[var(--topbar-h)] shrink-0 items-center gap-1 px-3 text-sm print:hidden">
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center">
        {page ? (
          <>
            {shownDirs.map((d, i) => (
              <Fragment key={d?.path ?? '…'}>
                {i > 0 && <ChevronRight size={14} className="shrink-0 text-neutral-400" />}
                {d ? (
                  folder(d)
                ) : (
                  <MenuButton
                    label="Show full path"
                    className={`${crumb} hover:bg-neutral-100 hover:text-neutral-900`}
                    groups={[{ items: hidden.map((h) => ({ label: h.path, icon: Folder, onSelect: () => folderPage(h.path) && go(folderPage(h.path)!) })) }]}
                  >
                    …
                  </MenuButton>
                )}
              </Fragment>
            ))}
            {dirs.length > 0 && <ChevronRight size={14} className="shrink-0 text-neutral-400" />}
            <span aria-current="page" className="flex h-7 min-w-0 items-center gap-1.5 px-1.5 text-neutral-900">
              <span className="grid size-4 shrink-0 place-items-center text-[14px] leading-none">
                <PageIcon icon={icon?.icon} color={icon?.iconColor} fallback={page.endsWith('.md') ? FileText : Presentation} size={16} />
              </span>
              <span className="truncate">{name}</span>
            </span>
          </>
        ) : (
          <span className="truncate px-1.5 font-medium text-neutral-900">{title}</span>
        )}
      </nav>
      {page && (
        <>
          <span aria-live="polite" className="mr-1 hidden shrink-0 text-xs text-neutral-500 sm:inline">
            {status}
          </span>
          {toggleFavorite && (
            <button className={iconButton} aria-pressed={favorite} title={favorite ? 'Remove from favorites' : 'Add to favorites'} aria-label="Favorite" onClick={toggleFavorite}>
              <Star size={16} className={favorite ? 'fill-[var(--icon-yellow)] text-[var(--icon-yellow)]' : ''} />
            </button>
          )}
          {menu && (
            <MenuButton label="Page actions" groups={menu} className={iconButton}>
              <MoreHorizontal size={16} />
            </MenuButton>
          )}
        </>
      )}
      {panel && (
        <button className={iconButton} title={panel.open ? 'Hide panel' : 'Show panel'} aria-label={panel.open ? 'Hide panel' : 'Show panel'} aria-expanded={panel.open} onClick={panel.toggle}>
          {panel.open ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>
      )}
    </header>
  )
}
