import { restoreElements } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { BinaryFiles } from '@excalidraw/excalidraw/types'
import { cardText, swapURLs } from './board'
import { getFile } from './fs'
import { resolvePath } from './paths'

export const readText = async (root: FileSystemDirectoryHandle, path: string) => (await (await getFile(root, path)).getFile()).text()

/**
 * Parses board file `path`: image `assets/` links are swapped for data URLs (originals returned in `links`
 * by fileId) and doc card texts are refreshed from their docs. Shared by the board page and doc embeds.
 */
export async function readBoard(root: FileSystemDirectoryHandle, path: string, text: string) {
  const data = JSON.parse(text)
  const links: Record<string, string> = {}
  const urls: Record<string, string> = {}
  for (const [id, f] of Object.entries((data.files ?? {}) as BinaryFiles)) {
    if (f.dataURL.startsWith('data:')) continue
    links[id] = f.dataURL
    try {
      urls[id] = await dataURL(await (await getFile(root, resolvePath(path, f.dataURL))).getFile())
    } catch {
      console.warn('missing board image', f.dataURL) // keep the link so the next save doesn't drop it
    }
  }
  const byId = new Map<string, ExcalidrawElement>(data.elements.map((el: ExcalidrawElement) => [el.id, el]))
  let stale = false
  const elements = await Promise.all(
    data.elements.map(async (el: ExcalidrawElement) => {
      const docPath = el.type === 'text' && el.containerId && byId.get(el.containerId)?.customData?.docPath
      if (!docPath) return el
      const target = resolvePath(path, docPath)
      const card = cardText(target, await readText(root, target).catch(() => undefined))
      if (card === el.originalText) return el
      stale = true
      return { ...el, text: card, originalText: card }
    }),
  )
  return {
    data: {
      ...data,
      elements: stale ? restoreElements(elements, null, { refreshDimensions: true, repairBindings: true }) : elements,
      files: swapURLs(data.files ?? {}, urls),
    },
    links,
  }
}

const dataURL = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
