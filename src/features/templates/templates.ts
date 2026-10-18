import { splitFrontMatter } from '@/features/doc/frontmatter'

export type Template = { name: string; body: string; builtIn?: boolean }

const FENCE = '```'

/** Built in code, not read from disk. `{{date}}` becomes the day the doc is made. */
export const BUILT_IN: Template[] = [
  {
    name: 'Meeting notes',
    builtIn: true,
    body: '# Meeting notes\n\n**Date:** {{date}}\n\n**Attendees:**\n\n## Agenda\n\n- \n\n## Notes\n\n## Action items\n\n- [ ] \n',
  },
  {
    name: 'Journal',
    builtIn: true,
    body: '# {{date}}\n\n## Highlights\n\n- \n\n## Notes\n\n## Grateful for\n\n- \n',
  },
  {
    name: 'Task list',
    builtIn: true,
    body: `# Tasks\n\n${FENCE}tasks\n| Task | Status | Tags |\n|---|---|---|\n| New task | Not started |  |\n${FENCE}\n`,
  },
]

export const journal = BUILT_IN[1]

/** `created:` set in a front matter block (adding the line or the block), other keys kept. */
function setCreated(front: string, created: string) {
  if (!front) return `---\ncreated: ${created}\n---\n`
  if (/^created:.*$/m.test(front)) return front.replace(/^created:.*$/m, `created: ${created}`)
  return front.replace(/^---\r?\n/, (open) => `${open}created: ${created}\n`)
}

/** Text of a new doc made from a template body: fresh `created`, `{{date}}` filled in, other front matter kept. */
export function fromTemplate(body: string, created: string, date: string) {
  const { front, body: text } = splitFrontMatter(body)
  return setCreated(front, created) + text.replace(/\{\{date\}\}/g, date)
}

/** A doc as template text: the page without its `created` line. */
export function toTemplate(markdown: string) {
  const { front, body } = splitFrontMatter(markdown)
  const rest = front.replace(/^created:.*(\r?\n|$)/m, '')
  return (/^---\r?\n---(\r?\n|$)$/.test(rest) ? '' : rest) + body
}
