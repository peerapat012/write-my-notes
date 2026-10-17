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
