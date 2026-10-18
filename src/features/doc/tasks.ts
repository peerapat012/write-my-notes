export const STATUSES = ['Not started', 'In progress', 'Done'] as const
export type Status = (typeof STATUSES)[number]

/** `status` is kept as written; use `statusOf` for what to show. */
export type Task = { name: string; status: string; tags: string[] }

/** What the app shows for a status cell: unknown values count as Not started. */
export const statusOf = (status: string): Status => STATUSES.find((s) => s === status) ?? 'Not started'

/** Cells of one table line. A `|` inside a cell is written `\|`. */
function cells(line: string) {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, (end, at, all) => (all[at - 1] === '\\' ? end : ''))
  return inner.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|').trim())
}

const cell = (text: string) => text.replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|')

/** Tasks of a ```tasks block's text: a GFM table with the columns Task, Status, Tags. Other lines are ignored. */
export function parseTasks(text: string): Task[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().startsWith('|'))
  const rows = lines.map(cells).filter((c) => !c.every((x) => /^:?-+:?$/.test(x))) // drop the --- separator
  if (rows[0]?.[0]?.toLowerCase() === 'task') rows.shift() // drop the header
  return rows.map(([name = '', status = '', tags = '']) => ({
    name,
    status,
    tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
  }))
}

/** The block text for `tasks`: header, separator, one line per task. */
export function serializeTasks(tasks: Task[]) {
  const line = (...c: string[]) => `| ${c.join(' | ')} |`
  return [
    line('Task', 'Status', 'Tags'),
    '|---|---|---|',
    ...tasks.map((t) => line(cell(t.name), cell(t.status), cell(t.tags.join(', '))))
  ].join('\n')
}

/** Text of a new task block: one row to start from. */
export const NEW_TASKS = serializeTasks([{ name: 'New task', status: 'Not started', tags: [] }])
