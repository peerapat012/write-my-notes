/** One searchable text on a board; `id` is the element to zoom to (the container for bound text). */
export type BoardText = { id: string; text: string }

type El = { id: string; type: string; text?: string; containerId?: string | null; isDeleted?: boolean; customData?: Record<string, any> }

/** Texts of a board's live text elements. Doc-card titles are skipped: they are already doc titles. */
export function searchTexts(elements: readonly El[]): BoardText[] {
  const byId = new Map(elements.map((el) => [el.id, el]))
  const out: BoardText[] = []
  for (const el of elements) {
    if (el.type !== 'text' || el.isDeleted || !el.text?.trim()) continue
    const container = el.containerId ? byId.get(el.containerId) : undefined
    if (container?.isDeleted || container?.customData?.docPath) continue
    out.push({ id: container ? container.id : el.id, text: el.text.trim() })
  }
  return out
}

/** `searchTexts` of a board file's contents; none if it does not parse. */
export function fileSearchTexts(json: string): BoardText[] {
  try {
    return searchTexts(JSON.parse(json).elements ?? [])
  } catch {
    return []
  }
}
