import { unquote } from '@/lib/git'

export type Ref = { name: string; kind: 'head' | 'branch' | 'tag' }
export type Commit = { hash: string; parents: string[]; author: string; date: string; refs: Ref[]; message: string }

/** `%D` text such as `HEAD -> main, origin/main, tag: v1`. */
export function parseRefs(decoration: string): Ref[] {
  return decoration
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
    .flatMap((r): Ref[] => {
      if (r.startsWith('tag: ')) return [{ name: r.slice(5), kind: 'tag' }]
      if (r === 'HEAD') return [{ name: 'HEAD', kind: 'head' }]
      if (r.startsWith('HEAD -> ')) return [{ name: 'HEAD', kind: 'head' }, { name: r.slice(8), kind: 'branch' }]
      return [{ name: r, kind: 'branch' }]
    })
}

/** `graphLog` output: one commit per line, fields split by U+001F. */
export function parseGraph(out: string): Commit[] {
  return out
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [hash, parents, author, date, refs, ...message] = line.split('\x1f')
      return { hash, parents: parents.split(' ').filter(Boolean), author, date, refs: parseRefs(refs ?? ''), message: message.join('\x1f') }
    })
}

/** One file of `git show --name-status`; `from` is the old path of a rename. */
export type FileChange = { status: string; path: string; from?: string }

export function parseChanges(out: string): FileChange[] {
  return out
    .split(/\r?\n/)
    .filter((l) => l.includes('\t'))
    .map((l) => {
      const [status, a, b] = l.split('\t')
      return b === undefined ? { status: status[0], path: unquote(a) } : { status: status[0], from: unquote(a), path: unquote(b) }
    })
}

/**
 * What to draw in one row, in lane columns. `top`: a line comes into the node from above; `bottom`: one leaves below;
 * `joins`: other lanes that end at this node; `forks`: lanes that start at it (a merge's other parents); `passing`: lanes that go straight through.
 */
export type Row = { commit: Commit; col: number; top: boolean; bottom: boolean; joins: number[]; forks: number[]; passing: number[] }

/** Lanes for commits in `git log` order (children before parents). */
// ponytail: assumes a parent never appears before its child (clock skew can break that; the stray lane just ends late). Add --topo-order to the log shape if it matters.
export function layout(commits: Commit[]): { rows: Row[]; width: number } {
  const lanes: (string | null)[] = [] // hash each lane is waiting for
  const free = () => {
    const i = lanes.indexOf(null)
    return i < 0 ? lanes.push(null) - 1 : i
  }
  let width = 1
  const rows = commits.map((commit): Row => {
    let col = lanes.indexOf(commit.hash)
    const top = col >= 0
    if (!top) lanes[(col = free())] = commit.hash
    const joins = lanes.flatMap((h, i) => (h === commit.hash && i !== col ? [i] : []))
    for (const i of joins) lanes[i] = null
    const passing = lanes.flatMap((h, i) => (h !== null && i !== col ? [i] : []))
    const [first, ...others] = commit.parents
    lanes[col] = first ?? null
    const forks = others.map((p) => {
      const at = lanes.indexOf(p)
      if (at >= 0) return at
      lanes[(at < 0 ? free() : at)] = p
      return lanes.indexOf(p)
    })
    width = Math.max(width, lanes.length)
    while (lanes.length && lanes.at(-1) === null) lanes.pop()
    return { commit, col, top, bottom: first !== undefined, joins, forks, passing }
  })
  return { rows, width }
}
