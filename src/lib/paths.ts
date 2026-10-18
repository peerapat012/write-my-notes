/** Relative link from the file at `from` to the file at `to`; both are paths from the notes root. */
export function relativePath(from: string, to: string) {
  const a = from.split('/').slice(0, -1)
  const b = to.split('/')
  let i = 0
  while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++
  return [...Array(a.length - i).fill('..'), ...b.slice(i)].join('/')
}

/** Root-relative path for link `rel` found in the file at `from`. */
export function resolvePath(from: string, rel: string) {
  const out = from.split('/').slice(0, -1)
  for (const part of decodeURI(rel).split('/')) {
    if (part === '..') out.pop()
    else if (part !== '.' && part) out.push(part)
  }
  return out.join('/')
}

export const pageUrl = (path: string) => import.meta.env.BASE_URL + 'page/' + path.split('/').map(encodeURIComponent).join('/')
export const parentOf = (path: string) => path.slice(0, Math.max(path.lastIndexOf('/'), 0))
export const join = (dir: string, name: string) => (dir ? `${dir}/${name}` : name)
export const ext = (path: string) => path.match(/\.(md|excalidraw)$/)?.[0] ?? ''

/** `Untitled`, or `Untitled 2`, `Untitled 3`... for the first name not used by a page or folder in `dir`. `taken` holds every path in the folder. */
export function untitledName(taken: Set<string>, dir: string, extension: string) {
  const used = (name: string) => taken.has(join(dir, name + extension)) || taken.has(join(dir, name))
  let name = 'Untitled'
  for (let i = 2; used(name); i++) name = `Untitled ${i}`
  return name
}

/** The name of a page nobody has named yet; its title shows the "Title" placeholder. */
export const UNTITLED = /^Untitled( \d+)?$/
