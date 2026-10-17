import { generate } from './gemini'

export type TextEdit = { id: string; text: string }
type El = { id: string; type: string; text?: string; containerId?: string | null; isDeleted?: boolean; version?: number }

/** Text of the selected elements: selected text elements, plus the text bound to selected shapes. */
export function selectedTexts(elements: readonly El[], selected: Record<string, unknown>): TextEdit[] {
  return elements
    .filter((el) => el.type === 'text' && !el.isDeleted && (selected[el.id] || (el.containerId && selected[el.containerId])))
    .map((el) => ({ id: el.id, text: el.text! }))
}

/** Returns `elements` with the edited texts applied; edits for unknown ids are ignored. */
export function applyEdits<T extends El>(elements: readonly T[], edits: TextEdit[]): T[] {
  const byId = new Map(edits.map((e) => [e.id, e.text]))
  return elements.map((el) =>
    byId.has(el.id) ? { ...el, text: byId.get(el.id), originalText: byId.get(el.id), version: (el.version ?? 0) + 1, versionNonce: Math.floor(Math.random() * 2 ** 31) } : el,
  )
}

const SCHEMA = {
  type: 'ARRAY',
  items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, text: { type: 'STRING' } }, required: ['id', 'text'] },
}

/** Rewrites each text by `instruction`; the model returns the same ids with new text. */
export const editTexts = (model: string, instruction: string, texts: TextEdit[]) =>
  generate<TextEdit[]>(
    model,
    `Apply this instruction to every text below: ${instruction}\nReturn a JSON array of {id, text}: keep each id, change only the text.\n${JSON.stringify(texts)}`,
    SCHEMA,
  )
