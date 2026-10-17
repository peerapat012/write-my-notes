import { generate } from './gemini'

/** Every non-empty text on the board: stickies, text, labels, doc-card titles. */
export function boardTexts(elements: readonly { type: string; text?: string; isDeleted?: boolean }[]) {
  return elements.filter((el) => el.type === 'text' && !el.isDeleted && el.text?.trim()).map((el) => el.text!.trim())
}

/** Doc body: a link back to the board (same folder), then the summary. */
export const summaryDoc = (boardFile: string, markdown: string) =>
  `[${boardFile.replace(/\.excalidraw$/, '')}](${boardFile.replace(/ /g, '%20')})\n\n${markdown.trim()}\n`

/** Markdown summary of the board's texts. */
export async function summarize(model: string, texts: string[]) {
  const { markdown } = await generate<{ markdown: string }>(
    model,
    `Summarize this whiteboard as concise markdown notes (headings and bullets, no preamble). Its texts, one block each:\n\n${texts.join('\n\n')}`,
    { type: 'OBJECT', properties: { markdown: { type: 'STRING' } }, required: ['markdown'] },
  )
  return markdown
}
