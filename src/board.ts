type Files = Record<string, { dataURL: string }>

/** Replaces each file's `dataURL` with `urls[fileId]` when given; fileIds and other fields stay. */
export function swapURLs<T extends Files>(files: T, urls: Record<string, string>): T {
  return Object.fromEntries(Object.entries(files).map(([id, f]) => [id, { ...f, dataURL: urls[id] ?? f.dataURL }])) as T
}

/**
 * Final `.excalidraw` text: image data URLs swapped for their `assets/` links (by fileId)
 * and the app's top-level `"icon"` added (Excalidraw drops unknown fields).
 */
export function toDisk(json: string, icon?: string, links: Record<string, string> = {}) {
  const scene = JSON.parse(json)
  if (scene.files) scene.files = swapURLs(scene.files, links)
  return JSON.stringify(icon ? { ...scene, icon } : scene, null, 2)
}
