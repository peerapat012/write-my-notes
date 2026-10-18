import type { Mark, Node } from '@milkdown/kit/prose/model'
import { Plugin, TextSelection, type EditorState } from '@milkdown/kit/prose/state'
import { Decoration, DecorationSet, type EditorView } from '@milkdown/kit/prose/view'
import { $prose } from '@milkdown/kit/utils'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { pageTarget, titleOf } from '@/lib/pages'
import { relativePath } from '@/lib/paths'
import LinkCard from './LinkCard'

// Page links made with `@`. A text link is a plain Markdown link; a preview card is a paragraph that holds only
// the link, with the link title "card": `[Plan](../Plan.md "card")`. Other editors show both as normal links.

/** A Markdown line that is a preview card: only a link titled "card". */
export const isCardLine = (line: string) => /^\s*\[[^\]]*\]\([^)\s]+\s+"card"\)\s*$/.test(line)

/** The href of a paragraph that is a preview card, else undefined. */
export function cardHref(node: Node) {
  if (node.type.name !== 'paragraph' || node.childCount !== 1) return undefined
  const link = node.firstChild!.marks.find((m) => m.type.name === 'link')
  return link?.attrs.title === 'card' ? (link.attrs.href as string) : undefined
}

/** The link mark at `pos` and the range it covers (adjacent text with the same mark). */
export function linkAt(state: EditorState, pos: number): { from: number; to: number; mark: Mark } | undefined {
  const $pos = state.doc.resolve(pos)
  const parent = $pos.parent
  const start = $pos.start()
  let offset = 0
  const spans: { from: number; to: number; mark?: Mark }[] = []
  parent.forEach((child) => {
    spans.push({ from: start + offset, to: start + offset + child.nodeSize, mark: child.marks.find((m) => m.type.name === 'link') })
    offset += child.nodeSize
  })
  const i = spans.findIndex((s) => s.mark && s.from <= pos && pos <= s.to && (pos < s.to || s.to === start + offset))
  if (i < 0) return undefined
  const mark = spans[i].mark!
  let a = i
  let b = i
  while (a > 0 && spans[a - 1].mark?.eq(mark)) a--
  while (b < spans.length - 1 && spans[b + 1].mark?.eq(mark)) b++
  return { from: spans[a].from, to: spans[b].to, mark }
}

/** Replaces `from`–`to` (the typed `@`) with a link to page `target`, then a space. */
export function insertPageLink(view: EditorView, from: number, to: number, docPath: string, target: string) {
  const { schema } = view.state
  const href = relativePath(docPath, target).replace(/ /g, '%20')
  const link = schema.text(titleOf(target), [schema.marks.link.create({ href, title: null })])
  const tr = view.state.tr.replaceWith(from, to, [link, schema.text(' ')])
  tr.setSelection(TextSelection.create(tr.doc, from + link.nodeSize + 1))
  view.dispatch(tr)
  view.focus()
}

/** Text link or preview card. A link inside a sentence moves to its own paragraph under it to become a card. */
export function setCard(view: EditorView, pos: number, card: boolean) {
  const hit = linkAt(view.state, pos)
  if (!hit) return
  const { from, to, mark } = hit
  const { schema } = view.state
  const next = schema.marks.link.create({ ...mark.attrs, title: card ? 'card' : null })
  const $from = view.state.doc.resolve(from)
  const alone = $from.parent.type.name === 'paragraph' && from === $from.start() && to === $from.end()
  const tr = view.state.tr
  if (!card || alone) tr.removeMark(from, to, mark).addMark(from, to, next)
  else {
    const text = view.state.doc.textBetween(from, to)
    const after = $from.after()
    tr.insert(after, schema.nodes.paragraph.create(null, schema.text(text, [next]))).delete(from, to)
  }
  view.dispatch(tr)
}

export function removeLink(view: EditorView, pos: number) {
  const hit = linkAt(view.state, pos)
  if (hit) view.dispatch(view.state.tr.removeMark(hit.from, hit.to, hit.mark))
}

/** Calls `onAt(pos, rect)` when `@` is typed at a word start, so the editor can open the page picker there. */
export const mentionPlugin = (onAt: (pos: number, at: DOMRect) => void) =>
  $prose(
    () =>
      new Plugin({
        props: {
          handleTextInput(view, from, _to, text) {
            if (text !== '@' || view.state.doc.resolve(from).parent.type.name === 'code_block') return false
            const before = view.state.doc.textBetween(Math.max(view.state.doc.resolve(from).start(), from - 1), from)
            if (before && !/\s/.test(before)) return false
            setTimeout(() => {
              const c = view.coordsAtPos(from + 1)
              onAt(from, new DOMRect(c.left, c.top, 0, c.bottom - c.top))
            })
            return false
          },
        },
      }),
  )

const roots = new WeakMap<HTMLElement, Root>()

/** Draws each card paragraph as a preview card (the paragraph stays in the document, hidden). */
export const cardView = (docPath: string) =>
  $prose(
    () =>
      new Plugin({
        props: {
          decorations(state) {
            const decorations: Decoration[] = []
            state.doc.descendants((node, pos) => {
              const href = cardHref(node)
              if (href === undefined) return node.isBlock && !node.isTextblock
              const target = pageTarget(docPath, href)
              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, { class: 'card-source', style: 'display: none' }),
                Decoration.widget(
                  pos,
                  (view, getPos) => {
                    const dom = document.createElement('div')
                    dom.contentEditable = 'false'
                    const root = createRoot(dom)
                    roots.set(dom, root)
                    const inside = () => (getPos() ?? 0) + 1 // a position inside the card paragraph's link
                    root.render(
                      createElement(LinkCard, {
                        path: target,
                        title: node.textContent,
                        editable: view.editable,
                        onText: () => setCard(view, inside(), false),
                        onRemove: () => removeLink(view, inside()),
                      }),
                    )
                    return dom
                  },
                  {
                    side: -1,
                    key: `card:${href}:${node.textContent}`,
                    stopEvent: () => true,
                    ignoreSelection: true,
                    destroy: (dom) => {
                      const root = roots.get(dom as HTMLElement)
                      setTimeout(() => root?.unmount())
                    },
                  },
                ),
              )
              return false
            })
            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
  )
