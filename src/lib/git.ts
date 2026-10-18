import { invoke } from '@tauri-apps/api/core'

export type GitOutput = { code: number; stdout: string; stderr: string }
export type Change = { status: string; path: string; from?: string }

/** Runs `git <args>` in the notes folder (desktop only; the Tauri command allows a fixed set). */
export const git = (...args: string[]) => invoke<GitOutput>('git', { args })

const ESCAPES: Record<string, number> = { n: 10, t: 9, '"': 34, '\\': 92 }

/** Git quotes paths with unusual characters: "a \"b\".md", or utf-8 bytes as octal escapes. */
function unquote(path: string) {
  if (!path.startsWith('"')) return path
  const inner = path.slice(1, -1)
  const bytes: number[] = []
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] !== '\\') bytes.push(...new TextEncoder().encode(inner[i]))
    else if (/^[0-7]{3}$/.test(inner.slice(i + 1, i + 4))) {
      bytes.push(parseInt(inner.slice(i + 1, i + 4), 8))
      i += 3
    } else bytes.push(ESCAPES[inner[++i]] ?? inner.charCodeAt(i))
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

/** `git status --porcelain` output as one change per line: two status letters, then the path (`old -> new` for a rename). */
export function parseStatus(out: string): Change[] {
  return out
    .split(/\r?\n/)
    .filter((line) => line.length > 3)
    .map((line) => {
      const status = line.slice(0, 2)
      const rest = line.slice(3)
      const arrow = status.includes('R') || status.includes('C') ? rest.indexOf(' -> ') : -1
      return arrow < 0 ? { status, path: unquote(rest) } : { status, from: unquote(rest.slice(0, arrow)), path: unquote(rest.slice(arrow + 4)) }
    })
}

export type GitState = { kind: 'ok'; changes: Change[] } | { kind: 'no-git' } | { kind: 'no-repo' } | { kind: 'error'; message: string }

/** Is git installed, is the folder a repo, and what changed. Never throws. */
export async function gitState(): Promise<GitState> {
  try {
    const repo = await git('rev-parse', '--is-inside-work-tree')
    if (repo.code !== 0) return { kind: 'no-repo' }
    const status = await git('status', '--porcelain')
    return status.code === 0 ? { kind: 'ok', changes: parseStatus(status.stdout) } : { kind: 'error', message: status.stderr.trim() }
  } catch (e) {
    return String(e) === 'git not found' ? { kind: 'no-git' } : { kind: 'error', message: String(e) }
  }
}

/** Runs git; resolves to its error text, or nothing on success. */
async function run(...args: string[]) {
  const r = await git(...args)
  if (r.code !== 0) return (r.stderr || r.stdout).trim() || `git ${args[0]} failed (exit ${r.code})`
}

/** `git add -A` then `git commit -m`. */
export async function commitAll(message: string) {
  return (await run('add', '-A')) ?? run('commit', '-m', message)
}

/** What `pull` returns, instead of running git, when the working tree has changes. */
export const COMMIT_FIRST = 'Commit before pull'

/** `git pull --rebase`, refused while the working tree is dirty. */
export async function pull() {
  const state = await gitState()
  if (state.kind === 'ok' && state.changes.length) return COMMIT_FIRST
  return run('pull', '--rebase')
}

export const push = () => run('push')
