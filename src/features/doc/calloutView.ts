import { commandsCtx, editorViewCtx } from '@milkdown/kit/core'
import type { Ctx } from '@milkdown/kit/ctx'
import { clearTextInCurrentBlockCommand } from '@milkdown/kit/preset/commonmark'
import { Plugin, TextSelection } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet, type EditorView } from '@milkdown/kit/prose/view'
import { $prose } from '@milkdown/kit/utils'
import { calloutMarker, DEFAULT_EMOJI, parseCallout } from './callout'

// A callout is a blockquote with a marker paragraph (callout.ts). The quote stays in the document, so that is
// what is saved; the marker paragraph is hidden and an emoji button is drawn in its place.

/** Slash menu icon (lucide "lightbulb"). */
export const CALLOUT_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>'

/** Replaces the empty block at the cursor with a callout and puts the cursor in its body. */
export function insertCallout(view: EditorView) {
  const { schema } = view.state
  const { $from } = view.state.selection
  const paragraph = schema.nodes.paragraph
  const quote = schema.nodes.blockquote.create(null, [paragraph.create(null, schema.text(calloutMarker())), paragraph.create()])
  const from = $from.before()
  const tr = view.state.tr.replaceRangeWith(from, $from.after(), quote)
  tr.setSelection(TextSelection.create(tr.doc, from + quote.nodeSize - 2))
  view.dispatch(tr.scrollIntoView())
  view.focus()
}

/** The slash menu's Callout item. */
export const calloutItem = {
  label: 'Callout',
  icon: CALLOUT_ICON,
  onRun: (ctx: Ctx) => {
    ctx.get(commandsCtx).call(clearTextInCurrentBlockCommand.key)
    insertCallout(ctx.get(editorViewCtx))
  },
}

/** Sets the emoji of the callout whose blockquote starts at `pos`. */
export function setCalloutEmoji(view: EditorView, pos: number, emoji?: string) {
  const quote = view.state.doc.nodeAt(pos)
  const first = quote?.firstChild
  if (!first || parseCallout(first.textContent) === undefined) return
  const text = view.state.schema.text(calloutMarker(emoji))
  view.dispatch(view.state.tr.replaceWith(pos + 2, pos + first.nodeSize, text))
}

/** Milkdown plugin: blockquotes that start with a callout marker are shown as callouts. `onEmoji` opens the picker. */
export const calloutView = (onEmoji: (pos: number, at: DOMRect) => void) =>
  $prose(
    () =>
      new Plugin({
        props: {
          decorations(state) {
            const decorations: Decoration[] = []
            state.doc.descendants((node, pos) => {
              if (node.type.name !== 'blockquote') return
              const first = node.firstChild
              const emoji = first && parseCallout(first.textContent)
              if (!first || !emoji) return
              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, { class: 'callout' }),
                Decoration.node(pos + 1, pos + 1 + first.nodeSize, { class: 'callout-marker' }),
                Decoration.widget(
                  pos + 1,
                  () => {
                    const button = document.createElement('button')
                    button.type = 'button'
                    button.className = 'callout-emoji'
                    button.contentEditable = 'false'
                    button.title = 'Change icon'
                    button.setAttribute('aria-label', 'Change callout icon')
                    button.textContent = emoji || DEFAULT_EMOJI
                    button.addEventListener('mousedown', (e) => e.preventDefault())
                    button.addEventListener('click', () => onEmoji(pos, button.getBoundingClientRect()))
                    return button
                  },
                  { side: -1, key: `callout-${pos}-${emoji}`, ignoreSelection: true },
                ),
              )
              return false
            })
            return DecorationSet.create(state.doc, decorations)
          },
          // Backspace at the start of the body would merge it into the hidden marker line.
          handleKeyDown(view, e) {
            const { $from, empty } = view.state.selection
            if (e.key !== 'Backspace' || !empty || $from.parentOffset || $from.depth < 2) return false
            const quote = $from.node(-1)
            const marker = quote.type.name === 'blockquote' && $from.index(-1) === 1 && parseCallout(quote.firstChild!.textContent)
            return !!marker
          },
        },
      }),
  )
