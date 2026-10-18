import { useSyncExternalStore } from 'react'
import { linkTarget } from './links'
import { relativePath } from './paths'

/** A doc or board as the editor widgets (page picker, chips, cards, data table) see it. App keeps the list current. */
export type PageInfo = { path: string; title: string; type: 'doc' | 'board'; icon?: string; iconColor?: string; mtime?: number; text?: string }

let pages: PageInfo[] = []
let byPath = new Map<string, PageInfo>()
const listeners = new Set<() => void>()

export function setPages(next: PageInfo[]) {
  pages = next
  byPath = new Map(next.map((p) => [p.path, p]))
  listeners.forEach((l) => l())
}

const subscribe = (cb: () => void) => (listeners.add(cb), () => void listeners.delete(cb))
export const usePages = () => useSyncExternalStore(subscribe, () => pages)
/** The page at `path`, re-rendering when the folder changes or a page is saved. */
export const usePage = (path?: string) => useSyncExternalStore(subscribe, () => (path ? byPath.get(path) : undefined))
export const pageAt = (path: string) => byPath.get(path)

export const titleOf = (path: string) => path.slice(path.lastIndexOf('/') + 1).replace(/\.(md|excalidraw)$/, '')

/** Markdown link from the doc at `from` to page `to`; `card` makes it a preview card. */
export const pageLink = (from: string, to: string, card = false) =>
  `[${titleOf(to).replace(/[[\]]/g, '')}](${relativePath(from, to).replace(/ /g, '%20')}${card ? ' "card"' : ''})`

/** Root-relative page path of `href` in the doc at `from`, when it points at a doc or board. */
export const pageTarget = (from: string, href: string) => {
  const target = linkTarget(from, href)
  return target && /\.(md|excalidraw)$/.test(target) ? target : undefined
}

// Navigation, set by App: `go` opens a page full screen, `peek` in the peek modal.
export const nav = { go: (_path: string) => {}, peek: (_path: string) => {} }

/** A click on a page link: Ctrl/Cmd+click opens it full screen, a plain click in the peek view. */
export function openPage(path: string, e?: { ctrlKey: boolean; metaKey: boolean }) {
  if (e && (e.ctrlKey || e.metaKey)) nav.go(path)
  else nav.peek(path)
}
