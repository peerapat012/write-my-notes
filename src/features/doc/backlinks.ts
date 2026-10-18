import type { Entry } from '@/features/sidebar/tree'

/** Pages (docs and boards) whose links or embeds point at `target`, in path order. Pages in `.trash/` and `.templates/` do not count. */
export function backlinks(target: string, entries: Entry[]): string[] {
  return entries
    .filter((e) => e.kind === 'file' && e.path !== target && !/^\.(trash|templates)(\/|$)/.test(e.path) && e.links?.includes(target))
    .map((e) => e.path)
    .sort((a, b) => a.localeCompare(b))
}
