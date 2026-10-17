import type { Crepe } from '@milkdown/crepe'
import { commandsCtx, editorViewCtx } from '@milkdown/kit/core'
import {
  blockquoteSchema,
  bulletListSchema,
  codeBlockSchema,
  headingSchema,
  liftListItemCommand,
  listItemSchema,
  orderedListSchema,
  paragraphSchema,
  setBlockTypeCommand,
  wrapInBlockTypeCommand,
} from '@milkdown/kit/preset/commonmark'
import { lift } from '@milkdown/kit/prose/commands'
import { NodeSelection, TextSelection } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'

export type BlockKind = 'text' | 'h1' | 'h2' | 'h3' | 'bullet' | 'numbered' | 'todo' | 'quote' | 'code'

/** The block to act on: the node Crepe's drag handle selects on mousedown, else the list item or top-level block at the cursor. */
function target(view: EditorView) {
  const sel = view.state.selection
  if (sel instanceof NodeSelection) return { from: sel.from, node: sel.node }
  const $from = sel.$from
  for (let d = $from.depth; d > 0; d--) if ($from.node(d).type.name === 'list_item') return { from: $from.before(d), node: $from.node(d) }
  return $from.depth ? { from: $from.before(1), node: $from.node(1) } : undefined
}

export function turnInto(crepe: Crepe, kind: BlockKind) {
  crepe.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const commands = ctx.get(commandsCtx)
    const block = target(view)
    if (!block) return

    // List item to another list kind: change it in place, so the list is not split in two. Markdown can't mix
    // bullets and numbers in one list, so the whole list takes the new type.
    if (block.node.type.name === 'list_item' && (kind === 'bullet' || kind === 'numbered' || kind === 'todo')) {
      const $item = view.state.doc.resolve(block.from)
      const listType = (kind === 'numbered' ? orderedListSchema : bulletListSchema).type(ctx)
      let tr = view.state.tr.setNodeMarkup(block.from, undefined, { ...block.node.attrs, checked: kind === 'todo' ? false : null })
      if ($item.parent.type !== listType) tr = tr.setNodeMarkup($item.before(), listType, $item.parent.attrs)
      view.dispatch(tr)
      return view.focus()
    }

    view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(block.from + 1))))

    // Unwrap lists and quotes first, so every kind starts from a plain top-level block.
    for (let i = 0; i < 8; i++) {
      const $from = view.state.selection.$from
      const names = Array.from({ length: $from.depth }, (_, d) => $from.node(d + 1).type.name)
      const before = view.state.doc
      if (names.includes('list_item')) commands.call(liftListItemCommand.key)
      else if (names.includes('blockquote')) lift(view.state, view.dispatch)
      if (view.state.doc === before) break // nothing left to unwrap (or it could not be)
    }

    const set = (type: ReturnType<typeof paragraphSchema.type>, attrs?: Record<string, unknown>) =>
      commands.call(setBlockTypeCommand.key, { nodeType: type, attrs })
    const wrap = (type: ReturnType<typeof paragraphSchema.type>, attrs?: Record<string, unknown>) => {
      set(paragraphSchema.type(ctx))
      commands.call(wrapInBlockTypeCommand.key, { nodeType: type, attrs })
    }
    if (kind === 'text') set(paragraphSchema.type(ctx))
    else if (kind === 'h1' || kind === 'h2' || kind === 'h3') set(headingSchema.type(ctx), { level: Number(kind[1]) })
    else if (kind === 'code') set(codeBlockSchema.type(ctx))
    else if (kind === 'bullet') wrap(bulletListSchema.type(ctx))
    else if (kind === 'numbered') wrap(orderedListSchema.type(ctx))
    else if (kind === 'todo') wrap(listItemSchema.type(ctx), { checked: false }) // as Crepe's own slash menu does
    else wrap(blockquoteSchema.type(ctx))
    view.focus()
  })
}

export function duplicate(crepe: Crepe) {
  crepe.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const block = target(view)
    if (block) view.dispatch(view.state.tr.insert(block.from + block.node.nodeSize, block.node.copy(block.node.content)).scrollIntoView())
    view.focus()
  })
}

export function remove(crepe: Crepe) {
  crepe.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const block = target(view)
    // deleteRange also drops a parent that would be left empty (the last item of a list).
    if (block) view.dispatch(view.state.tr.deleteRange(block.from, block.from + block.node.nodeSize))
    view.focus()
  })
}
