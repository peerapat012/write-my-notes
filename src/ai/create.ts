import { generate } from './gemini'

/** Element skeleton for `convertToExcalidrawElements`; kept loose so these mappers stay free of Excalidraw imports. */
export type Skeleton = Record<string, unknown>
export type Mode = 'sticky' | 'flow' | 'outline'

const NOTE = 200
const GAP = 24
const NODE = { w: 180, h: 60, gapX: 40, gapY: 80 }

/** Sticky notes in a near-square grid, centred on (cx, cy). */
export function stickySkeletons(notes: string[], cx: number, cy: number): Skeleton[] {
  const cols = Math.ceil(Math.sqrt(notes.length))
  const rows = Math.ceil(notes.length / cols)
  const x0 = cx - (cols * NOTE + (cols - 1) * GAP) / 2
  const y0 = cy - (rows * NOTE + (rows - 1) * GAP) / 2
  return notes.map((text, i) => ({
    type: 'rectangle',
    x: x0 + (i % cols) * (NOTE + GAP),
    y: y0 + Math.floor(i / cols) * (NOTE + GAP),
    width: NOTE,
    height: NOTE,
    backgroundColor: '#ffec99',
    fillStyle: 'solid',
    strokeColor: 'transparent',
    roughness: 0,
    roundness: { type: 3 },
    label: { text, fontSize: 18, strokeColor: '#1e1e1e' }, // not inherited: the note's own stroke is transparent
  }))
}

export type Flow = { nodes: { id: string; label: string }[]; edges: { from: string; to: string; label?: string }[] }

/** Flow diagram laid out top to bottom (longest-path layers), centred on (cx, cy). Arrows are bound to their nodes. */
export function flowSkeletons(flow: Flow, cx: number, cy: number, idPrefix = 'ai'): Skeleton[] {
  const ids = new Set(flow.nodes.map((n) => n.id))
  const edges = flow.edges.filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to)
  // Back edges (found by DFS) stay as arrows but are ignored for layering, so a loop doesn't push nodes to the bottom.
  const forward: typeof edges = []
  const state = new Map<string, 'open' | 'done'>()
  const visit = (id: string) => {
    state.set(id, 'open')
    for (const e of edges) {
      if (e.from !== id) continue
      if (state.get(e.to) === 'open') continue
      forward.push(e)
      if (!state.has(e.to)) visit(e.to)
    }
    state.set(id, 'done')
  }
  const hasIn = new Set(edges.map((e) => e.to))
  for (const n of [...flow.nodes.filter((n) => !hasIn.has(n.id)), ...flow.nodes]) if (!state.has(n.id)) visit(n.id)
  const layer = new Map(flow.nodes.map((n) => [n.id, 0]))
  for (let i = 0; i < flow.nodes.length; i++) for (const e of forward) layer.set(e.to, Math.max(layer.get(e.to)!, layer.get(e.from)! + 1))

  const rows: string[][] = []
  for (const n of flow.nodes) (rows[layer.get(n.id)!] ??= []).push(n.id)
  const height = rows.length * NODE.h + (rows.length - 1) * NODE.gapY
  const pos = new Map<string, { x: number; y: number }>()
  rows.forEach((row, r) => {
    if (!row) return
    const rowW = row.length * NODE.w + (row.length - 1) * NODE.gapX
    row.forEach((id, c) => pos.set(id, { x: cx - rowW / 2 + c * (NODE.w + NODE.gapX), y: cy - height / 2 + r * (NODE.h + NODE.gapY) }))
  })

  const nodes: Skeleton[] = flow.nodes.map((n) => ({
    type: 'rectangle',
    id: `${idPrefix}-${n.id}`,
    ...pos.get(n.id)!,
    width: NODE.w,
    height: NODE.h,
    backgroundColor: '#a5d8ff',
    fillStyle: 'solid',
    roughness: 0,
    roundness: { type: 3 },
    label: { text: n.label, fontSize: 16 },
  }))
  const arrows: Skeleton[] = edges.map((e) => {
    const a = pos.get(e.from)!
    const b = pos.get(e.to)!
    const x = a.x + NODE.w / 2
    const y = a.y + NODE.h / 2
    return {
      type: 'arrow',
      x,
      y,
      width: b.x + NODE.w / 2 - x,
      height: b.y + NODE.h / 2 - y,
      roughness: 0,
      start: { id: `${idPrefix}-${e.from}` },
      end: { id: `${idPrefix}-${e.to}` },
      ...(e.label && { label: { text: e.label, fontSize: 14 } }),
    }
  })
  return [...nodes, ...arrows]
}

/** A title text above a bullet text block, centred on (cx, cy). */
export function outlineSkeletons(outline: { title: string; items: string[] }, cx: number, cy: number): Skeleton[] {
  const body = outline.items.map((i) => `• ${i}`).join('\n')
  const w = Math.max(outline.title.length * 16, ...outline.items.map((i) => (i.length + 2) * 10), 120)
  const h = 28 * 1.25 + 16 + outline.items.length * 18 * 1.25
  const x = cx - w / 2
  const y = cy - h / 2
  return [
    { type: 'text', x, y, text: outline.title, fontSize: 28 },
    { type: 'text', x, y: y + 28 * 1.25 + 16, text: body, fontSize: 18 },
  ]
}

const STR = { type: 'STRING' }
const SCHEMAS = {
  sticky: { type: 'OBJECT', properties: { notes: { type: 'ARRAY', items: STR } }, required: ['notes'] },
  flow: {
    type: 'OBJECT',
    properties: {
      nodes: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: STR, label: STR }, required: ['id', 'label'] } },
      edges: { type: 'ARRAY', items: { type: 'OBJECT', properties: { from: STR, to: STR, label: STR }, required: ['from', 'to'] } },
    },
    required: ['nodes', 'edges'],
  },
  outline: { type: 'OBJECT', properties: { title: STR, items: { type: 'ARRAY', items: STR } }, required: ['title', 'items'] },
}
const ASK = {
  sticky: (n: number) => `Write exactly ${n} short sticky notes (a few words each) for:`,
  flow: (n: number) => `Draw a flow diagram of about ${n} nodes with short labels and edges between node ids for:`,
  outline: (n: number) => `Write a short title and ${n} concise bullet items for:`,
}

/** Asks Gemini for content of `mode` and maps it to skeletons centred on (cx, cy). */
export async function createContent(model: string, mode: Mode, prompt: string, n: number, cx: number, cy: number): Promise<Skeleton[]> {
  const data = await generate<any>(model, `${ASK[mode](n)} ${prompt}`, SCHEMAS[mode])
  if (mode === 'sticky') return stickySkeletons(data.notes.slice(0, n), cx, cy)
  if (mode === 'flow') return flowSkeletons(data, cx, cy, `ai${Math.random().toString(36).slice(2, 7)}`)
  return outlineSkeletons(data, cx, cy)
}
