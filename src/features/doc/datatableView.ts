import { Plugin } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'
import { $prose } from '@milkdown/kit/utils'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { LiveTable } from './TableBlock'

// Like the Tasks block: the ```datatable code block stays in the document (that is what is saved) and is hidden;
// a widget draws the table with React. The widget is keyed by the block's order, not its text, so an edit
// re-renders the same React tree (focus and menus survive) instead of rebuilding it.

const roots = new WeakMap<HTMLElement, Root>()

/** Milkdown plugin: every ```datatable code block is shown as a Data table. `docPath` resolves page links. */
export const datatableView = (docPath: string) =>
  $prose(() => {
    const listeners = new Set<() => void>()
    const subscribe = (cb: () => void) => (listeners.add(cb), () => void listeners.delete(cb))
    return new Plugin({
      view: () => ({ update: () => listeners.forEach((l) => l()) }),
      props: {
        decorations(state) {
          const decorations: Decoration[] = []
          let n = 0
          state.doc.descendants((node, pos) => {
            if (node.type.name !== 'code_block' || node.attrs.language !== 'datatable') return
            const end = pos + node.nodeSize
            decorations.push(
              Decoration.node(pos, end, { class: 'tasks-source', style: 'display: none' }),
              Decoration.widget(
                end,
                (view, getPos) => {
                  const dom = document.createElement('div')
                  dom.contentEditable = 'false'
                  const root = createRoot(dom)
                  roots.set(dom, root)
                  root.render(createElement(LiveTable, { view, getPos, docPath, subscribe }))
                  return dom
                },
                {
                  side: -1,
                  key: `datatable-${n++}`,
                  stopEvent: () => true,
                  ignoreSelection: true,
                  destroy: (dom) => {
                    const root = roots.get(dom as HTMLElement)
                    setTimeout(() => root?.unmount()) // not during ProseMirror's own update
                  },
                },
              ),
            )
            return false
          })
          return DecorationSet.create(state.doc, decorations)
        },
      },
    })
  })
