import { movedPath } from '@/lib/links'

const key = (vaultId: string) => `write-my-notes:favorites:${vaultId}`

/** Favorite page paths of one notes folder, in the order added. */
export function loadFavorites(vaultId: string, storage: Pick<Storage, 'getItem'> = localStorage): string[] {
  try {
    const saved = JSON.parse(storage.getItem(key(vaultId)) ?? '[]')
    return Array.isArray(saved) ? saved.filter((p): p is string => typeof p === 'string') : []
  } catch {
    return []
  }
}

export const saveFavorites = (vaultId: string, paths: string[], storage: Pick<Storage, 'setItem'> = localStorage) =>
  storage.setItem(key(vaultId), JSON.stringify(paths))

/** Adds `path` at the end, or removes it when it is already a favorite. */
export const toggleFavorite = (paths: string[], path: string) => (paths.includes(path) ? paths.filter((p) => p !== path) : [...paths, path])

/** Favorites after page (or folder) `from` moved to `to`, including pages in its child folder. */
export const moveFavorites = (paths: string[], from: string, to: string) => paths.map((p) => movedPath(p, from, to))

/** Favorites left after `removed` (a page file and its child folder, or a folder) went to the Trash. */
export const dropFavorites = (paths: string[], removed: string[]) => paths.filter((p) => !removed.some((r) => p === r || p.startsWith(r + '/')))
