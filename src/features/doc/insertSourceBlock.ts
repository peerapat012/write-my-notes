import { editorViewCtx } from '@milkdown/kit/core'
import type { Ctx } from '@milkdown/kit/ctx'
import { codeBlockSchema } from '@milkdown/kit/preset/commonmark'
import { TextSelection } from '@milkdown/kit/prose/state'

/**
 * The slash menu's Tasks and Data table: replaces the block at the cursor with a fenced block of `language` that
 * already holds `text`, in one step, and leaves the cursor in a paragraph after it. (Converting the block and then
 * typing the text put the text into a neighbouring paragraph whenever the cursor did not follow the conversion.)
 */
export function insertSourceBlock(ctx: Ctx, language: string, text: string) {
  const view = ctx.get(editorViewCtx)
  const { schema, selection } = view.state
  const { $from } = selection
  if (!$from.parent.isTextblock) return
  const block = codeBlockSchema.type(ctx).create({ language }, schema.text(text))
  const tr = view.state.tr.replaceWith($from.before(), $from.after(), block)
  const end = $from.before() + block.nodeSize
  const next = tr.doc.resolve(end).nodeAfter
  if (next?.type !== schema.nodes.paragraph) tr.insert(end, schema.nodes.paragraph.create())
  view.dispatch(tr.setSelection(TextSelection.near(tr.doc.resolve(end + 1))).scrollIntoView())
  view.focus()
}
