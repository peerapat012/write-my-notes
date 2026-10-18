import type { Entry } from '@/features/sidebar/tree'
import { ext } from './paths'

export const TRASH = '.trash'

export const trashPath = (path: string) => `${TRASH}/${path}`
export const originalPath = (trashed: string) => trashed.slice(TRASH.length + 1)

const stem = (path: string) => path.slice(0, path.length - ext(path).length)

/** Trashed pages that are not inside another trashed page's child folder: what the Trash view lists. */
export const topLevel = (pages: string[]) => pages.filter((p) => !pages.some((q) => p.startsWith(stem(q) + '/')))

/** Where a restored page goes: its own path, or with " (restored)" added until neither it nor its child folder is taken. `taken` holds lower-case paths. */
export function restoreTarget(path: string, taken: Set<string>) {
  const clash = (p: string) => taken.has(p.toLowerCase()) || taken.has(stem(p).toLowerCase())
  while (clash(path)) path = `${stem(path)} (restored)${ext(path)}`
  return path
}

/** What a `Vault` must offer for trash operations; the logic is shared between the web and desktop vaults. */
type Io = { has(path: string): Promise<boolean>; moveEntry(from: string, to: string): Promise<void>; remove(path: string): Promise<void>; list(): Promise<Entry[]> }

/** Moves each existing path into `.trash/`, keeping its path. Links to it are left alone, so they show as broken until restore. */
// ponytail: a page already in the trash at the same path is replaced; add numbered names if that loses something that matters.
export async function trashPaths(io: Io, paths: string[]) {
  for (const p of paths) {
    if (!(await io.has(p))) continue
    if (await io.has(trashPath(p))) await io.remove(trashPath(p))
    await io.moveEntry(p, trashPath(p))
  }
}

/** Moves a trashed page and its child folder back; returns the page's new path. */
export async function restorePath(io: Io, path: string) {
  const to = restoreTarget(path, new Set((await io.list()).map((e) => e.path.toLowerCase())))
  for (const [a, b] of [[path, to], [stem(path), stem(to)]])
    if (await io.has(trashPath(a))) await io.moveEntry(trashPath(a), b)
  return to
}

/** Original paths of the pages in the trash. */
export const trashedPages = (entries: Entry[]) => entries.filter((e) => e.kind === 'file' && ext(e.path)).map((e) => e.path)

/** Names (without `.md`) of the docs directly inside `.templates/`; `entries` are relative to that folder. */
export const templateNames = (entries: Entry[]) =>
  entries
    .filter((e) => e.kind === 'file' && e.path.endsWith('.md') && !e.path.includes('/'))
    .map((e) => e.path.slice(0, -3))
    .sort((a, b) => a.localeCompare(b))
