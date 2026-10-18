import { splitFrontMatter } from '@/features/doc/frontmatter'
import { parseIcon } from '@/features/sidebar/tree'

type Files = Record<string, { dataURL: string }>

/** Replaces each file's `dataURL` with `urls[fileId]` when given; fileIds and other fields stay. */
export function swapURLs<T extends Files>(files: T, urls: Record<string, string>): T {
  return Object.fromEntries(Object.entries(files).map(([id, f]) => [id, { ...f, dataURL: urls[id] ?? f.dataURL }])) as T
}

/**
 * Final `.excalidraw` text: image data URLs swapped for their `assets/` links (by fileId)
 * and the app's top-level `"icon"` and `"iconColor"` added (Excalidraw drops unknown fields).
 */
export function toDisk(json: string, icon?: string, links: Record<string, string> = {}, iconColor?: string) {
  const scene = JSON.parse(json)
  if (scene.files) scene.files = swapURLs(scene.files, links)
  return JSON.stringify(icon ? { ...scene, icon, ...(iconColor && { iconColor }) } : scene, null, 2)
}

/** Doc card text: icon + title, then the doc's first `n` non-empty lines without markdown syntax. No markdown = broken link. */
export function cardText(path: string, markdown?: string, n = 3) {
  const title = path.slice(path.lastIndexOf('/') + 1, -'.md'.length)
  if (markdown === undefined) return `⚠️ ${title}\nBroken link: doc not found`
  const lines = splitFrontMatter(markdown)
    .body.split('\n')
    .filter((l) => !l.trimStart().startsWith('```'))
    .map((l) =>
      l
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links keep their text
        .replace(/^\s*(#+|[-*+]( \[[ x]\])?|\d+\.|>)\s+/, '')
        .replace(/[*_`~]/g, '')
        .trim(),
    )
    .filter(Boolean)
    .slice(0, n)
  const icon = parseIcon(path, markdown)
  return [`${icon && !icon.startsWith('lucide:') ? icon : '📄'} ${title}`, ...lines].join('\n')
}

type El = { id: string; isDeleted?: boolean; containerId?: string | null }

/** Live elements to export: the selection (with text bound to selected shapes), or the whole board when nothing is selected. */
export function exportElements<T extends El>(elements: readonly T[], selected: Record<string, unknown>) {
  const live = elements.filter((el) => !el.isDeleted)
  return Object.keys(selected).length ? live.filter((el) => selected[el.id] || (el.containerId && selected[el.containerId])) : live
}
