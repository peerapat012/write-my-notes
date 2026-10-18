import { Plugin } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet, type EditorView } from '@milkdown/kit/prose/view'
import { $prose } from '@milkdown/kit/utils'
import { parseTasks, serializeTasks, statusOf, STATUSES, type Task } from './tasks'

// Crepe's code block preview is sanitized HTML (no inputs), so a ```tasks block gets its own widget instead: the
// code block node stays in the document (that is what is saved) and is hidden; the widget edits its text.

const PILL = {
  'Not started': 'bg-neutral-100 text-neutral-700',
  'In progress': 'bg-accent-soft text-accent',
  Done: 'bg-[color-mix(in_srgb,var(--icon-green)_18%,transparent)] text-(--icon-green)',
} as const

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') {
  const e = document.createElement(tag)
  e.className = className
  if (text) e.textContent = text
  return e
}

/** The editable table for `tasks`; `commit` gets the new list after each edit. */
function render(tasks: Task[], commit: (tasks: Task[]) => void) {
  const root = el('div', 'tasks-widget my-3 overflow-hidden rounded-lg border border-neutral-200 text-sm')
  root.contentEditable = 'false'
  const edit = (i: number, patch: Partial<Task>) => commit(tasks.map((t, j) => (j === i ? { ...t, ...patch } : t)))

  const head = el('div', 'grid grid-cols-[minmax(0,1fr)_9rem_minmax(0,12rem)_1.75rem] gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-500')
  for (const label of ['Task', 'Status', 'Tags', '']) head.append(el('span', '', label))
  root.append(head)

  tasks.forEach((task, i) => {
    const row = el('div', 'tasks-row grid grid-cols-[minmax(0,1fr)_9rem_minmax(0,12rem)_1.75rem] items-center gap-2 border-b border-neutral-200 px-3 py-1.5')

    const name = el('input', 'min-w-0 rounded bg-transparent px-1 py-0.5 outline-none hover:bg-neutral-100 focus:bg-neutral-100')
    name.value = task.name
    name.placeholder = 'Task'
    name.setAttribute('aria-label', 'Task name')
    name.onchange = () => edit(i, { name: name.value.trim() })
    name.onkeydown = (e) => e.key === 'Enter' && name.blur()

    const shown = statusOf(task.status)
    const status = el('select', `w-fit cursor-pointer appearance-none rounded-full px-2.5 py-0.5 text-xs font-medium outline-offset-2 ${PILL[shown]}`)
    status.setAttribute('aria-label', 'Status')
    // An unknown status is kept as written until the user picks one.
    for (const s of STATUSES) status.append(new Option(s, s, false, s === shown))
    status.onchange = () => edit(i, { status: status.value })

    const tags = el('div', 'flex min-w-0 flex-wrap items-center gap-1')
    for (const tag of task.tags) {
      const pill = el('span', 'inline-flex items-center gap-1 rounded bg-neutral-100 py-0.5 pr-1 pl-2 text-xs', tag)
      const x = el('button', 'rounded text-neutral-400 hover:text-neutral-700', '×')
      x.setAttribute('aria-label', `Remove tag ${tag}`)
      x.onclick = () => edit(i, { tags: task.tags.filter((t) => t !== tag) })
      pill.append(x)
      tags.append(pill)
    }
    const add = el('input', 'w-16 min-w-0 flex-1 bg-transparent py-0.5 text-xs outline-none placeholder:text-neutral-400')
    add.placeholder = 'Add tag'
    add.setAttribute('aria-label', 'Add tag')
    add.onkeydown = (e) => {
      const value = add.value.replace(/[,|]/g, '').trim()
      if ((e.key === 'Enter' || e.key === ',') && value) {
        e.preventDefault()
        if (!task.tags.includes(value)) edit(i, { tags: [...task.tags, value] })
      }
    }
    tags.append(add)

    const del = el('button', 'grid size-6 place-items-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900', '×')
    del.setAttribute('aria-label', 'Delete task')
    del.title = 'Delete task'
    del.onclick = () => commit(tasks.filter((_, j) => j !== i))

    row.append(name, status, tags, del)
    root.append(row)
  })

  const addRow = el('button', 'flex w-full items-center gap-1.5 px-3 py-2 text-left text-neutral-500 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900', '+ New task')
  addRow.onclick = () => commit([...tasks, { name: '', status: 'Not started', tags: [] }])
  root.append(addRow)
  return root
}

/** Replaces the text of the code block that ends at the widget's position. */
function setText(view: EditorView, widgetPos: number, text: string) {
  const node = view.state.doc.resolve(widgetPos).nodeBefore
  if (!node) return
  const from = widgetPos - node.nodeSize + 1
  const tr = view.state.tr
  if (node.content.size) tr.delete(from, from + node.content.size)
  tr.insertText(text, from)
  view.dispatch(tr)
}

/** Milkdown plugin: every ```tasks code block is shown as an editable table. */
export const tasksView = $prose(
  () =>
    new Plugin({
      props: {
        decorations(state) {
          const decorations: Decoration[] = []
          state.doc.descendants((node, pos) => {
            if (node.type.name !== 'code_block' || node.attrs.language !== 'tasks') return
            const end = pos + node.nodeSize
            const text = node.textContent
            decorations.push(
              Decoration.node(pos, end, { class: 'tasks-source' }),
              Decoration.widget(end, (view, getPos) => render(parseTasks(text), (tasks) => setText(view, getPos()!, serializeTasks(tasks))), {
                side: -1,
                key: text,
                stopEvent: () => true,
                ignoreSelection: true,
              }),
            )
            return false
          })
          return DecorationSet.create(state.doc, decorations)
        },
      },
    }),
)
