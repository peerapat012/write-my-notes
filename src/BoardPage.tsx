import {
  CaptureUpdateAction,
  Excalidraw,
  FONT_FAMILY,
  getSceneVersion,
  newElementWith,
  restoreElements,
  serializeAsJSON,
} from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, ExcalidrawImperativeAPI, ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types'
import { useEffect, useRef, useState } from 'react'
import { withIcon } from './board'
import { dirty, getFile, writeFile } from './fs'

type Props = { root: FileSystemDirectoryHandle; path: string }
type Tool = Parameters<ExcalidrawImperativeAPI['setActiveTool']>[0]['type']

const TOOLS: [Tool, string, string][] = [
  ['selection', '↖', 'Select (V)'],
  ['hand', '✋', 'Hand (H)'],
  ['text', 'T', 'Text (T)'],
  ['freedraw', '✎', 'Pen (P)'],
  ['rectangle', '▭', 'Rectangle (R)'],
  ['ellipse', '◯', 'Ellipse (O)'],
  ['diamond', '◇', 'Diamond (D)'],
  ['line', '╱', 'Line (L)'],
  ['arrow', '→', 'Arrow (A)'],
  ['eraser', '⌫', 'Eraser (E)'],
]
const FILLS = ['transparent', '#ffec99', '#b2f2bb', '#a5d8ff', '#ffc9c9', '#e9ecef']
const SIZES = [14, 18, 24, 34, 48]
const FONTS = [
  [FONT_FAMILY.Nunito, 'Sans'],
  [FONT_FAMILY.Excalifont, 'Hand'],
] as const

// Applied on every open; Excalidraw doesn't save currentItem* to the file anyway.
const DEFAULTS: Partial<AppState> = {
  currentItemRoughness: 0,
  currentItemFontFamily: FONT_FAMILY.Nunito,
  currentItemFontSize: 18,
  viewBackgroundColor: 'transparent', // let the dotted grid behind the canvas show through
}

/** Loads one board file and autosaves it: 500 ms debounce, serialized writes, `dirty` while unsaved. */
function boardFile(root: FileSystemDirectoryHandle, path: string) {
  let api: ExcalidrawImperativeAPI | undefined
  let file: FileSystemFileHandle
  let icon: string | undefined
  let version: number | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let writing = Promise.resolve()

  function save() {
    clearTimeout(timer)
    timer = undefined
    const app = { ...api!.getAppState(), viewBackgroundColor: '#ffffff' }
    const json = withIcon(serializeAsJSON(api!.getSceneElements(), app, api!.getFiles(), 'local'), icon)
    writing = writing.then(() => writeFile(file, json)).then(() => {
      if (!timer) dirty.delete(path)
    })
  }

  return {
    api: () => api,
    setApi: (a: ExcalidrawImperativeAPI) => void (api = a),
    async load() {
      file = await getFile(root, path)
      const data = JSON.parse(await (await file.getFile()).text())
      icon = data.icon
      return data
    },
    changed(elements: readonly ExcalidrawElement[]) {
      const v = getSceneVersion(elements)
      const first = version === undefined // first onChange is the loaded scene
      if (v === version) return
      version = v
      if (first) return
      dirty.add(path)
      clearTimeout(timer)
      timer = setTimeout(save, 500)
    },
    flush: () => void (timer && save()),
  }
}

export default function BoardPage({ root, path }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [board] = useState(() => boardFile(root, path))
  const [icon, setIcon] = useState<string>()
  const [ui, setUi] = useState({ tool: 'selection', zoom: 100, selected: false })
  const [initialData] = useState(async (): Promise<ExcalidrawInitialDataState> => {
    const data = await board.load()
    setIcon(data.icon)
    return { ...data, appState: { ...data.appState, ...DEFAULTS } }
  })

  useEffect(() => board.flush, [board]) // flush pending edits when leaving the page

  function onChange(elements: readonly ExcalidrawElement[], app: AppState) {
    const z = app.zoom.value
    const style = box.current!.style
    style.backgroundSize = `${20 * z}px ${20 * z}px`
    style.backgroundPosition = `${app.scrollX * z}px ${app.scrollY * z}px`
    const next = { tool: app.activeTool.type, zoom: Math.round(z * 100), selected: Object.keys(app.selectedElementIds).length > 0 }
    setUi((u) => (u.tool === next.tool && u.zoom === next.zoom && u.selected === next.selected ? u : next))

    board.changed(elements)
  }

  // Excalidraw has no API for undo/redo/zoom; send it the same shortcuts the keyboard would.
  const keys = (code: string, key: string, shiftKey = false) =>
    box.current!.querySelector('.excalidraw')!.dispatchEvent(new KeyboardEvent('keydown', { code, key, ctrlKey: true, shiftKey, bubbles: true }))

  /** Patches the selected elements (text ones for font changes, others for fill) and the defaults for new ones. */
  function styleSelection(patch: Record<string, unknown>, current: Partial<AppState>) {
    const a = board.api()!
    const sel = a.getAppState().selectedElementIds
    const isText = 'fontSize' in patch || 'fontFamily' in patch
    let elements = a.getSceneElementsIncludingDeleted().map((el) => {
      const hit = sel[el.id] || (el.type === 'text' && el.containerId && sel[el.containerId])
      return hit && isText === (el.type === 'text') ? newElementWith(el, patch) : el
    })
    if (isText) elements = restoreElements(elements, null, { refreshDimensions: true, repairBindings: true }) // re-measure text boxes
    a.updateScene({ elements, appState: current as AppState, captureUpdate: CaptureUpdateAction.IMMEDIATELY })
  }

  const btn = 'grid h-8 min-w-8 place-items-center rounded px-2 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent'
  const title = path.slice(path.lastIndexOf('/') + 1, -'.excalidraw'.length)
  return (
    <div className="board flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-1 border-b border-neutral-200 px-2">
        <button className={btn} title="Back" aria-label="Back" onClick={() => history.back()}>
          ←
        </button>
        <h1 className="mr-auto truncate px-2 font-medium">
          {icon ?? '🎨'} {title}
        </h1>
        <button className={btn} title="Undo (Ctrl+Z)" aria-label="Undo" onClick={() => keys('KeyZ', 'z')}>
          ↶
        </button>
        <button className={btn} title="Redo (Ctrl+Shift+Z)" aria-label="Redo" onClick={() => keys('KeyZ', 'Z', true)}>
          ↷
        </button>
        <span className="mx-2 h-5 border-l border-neutral-200" />
        <button className={btn} title="Zoom out" aria-label="Zoom out" onClick={() => keys('Minus', '-')}>
          −
        </button>
        <button className={`${btn} w-14 tabular-nums`} title="Reset zoom" onClick={() => keys('Digit0', '0')}>
          {ui.zoom}%
        </button>
        <button className={btn} title="Zoom in" aria-label="Zoom in" onClick={() => keys('Equal', '=')}>
          +
        </button>
        <span className="mx-2 h-5 border-l border-neutral-200" />
        <button className={btn} disabled title="AI (coming soon)">
          ✨ AI
        </button>
        <button className={btn} disabled title="Export (coming soon)">
          Export
        </button>
      </header>
      <div
        ref={box}
        className="relative flex-1"
        style={{ backgroundImage: 'radial-gradient(#a3a3a3 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      >
        <Excalidraw
          excalidrawAPI={board.setApi}
          initialData={initialData}
          onChange={onChange}
          UIOptions={{
            canvasActions: { changeViewBackgroundColor: false, clearCanvas: false, export: false, loadScene: false, saveToActiveFile: false, toggleTheme: false, saveAsImage: false },
            tools: { image: false },
          }}
        />
        <nav className="absolute top-1/2 left-3 z-10 flex [font-variant-emoji:text] -translate-y-1/2 flex-col gap-1 rounded-lg border border-neutral-200 bg-white p-1 shadow-sm">
          {TOOLS.map(([type, icon, label]) => (
            <button
              key={type}
              title={label}
              aria-label={label}
              aria-pressed={ui.tool === type}
              className={`${btn} ${ui.tool === type ? 'bg-neutral-200 hover:bg-neutral-200' : ''}`}
              onClick={() => board.api()?.setActiveTool({ type } as never)}
            >
              {icon}
            </button>
          ))}
        </nav>
        {ui.selected && (
          <div className="absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1 shadow-sm">
            {FILLS.map((c) => (
              <button
                key={c}
                title={c === 'transparent' ? 'No fill' : c}
                aria-label={`Fill ${c}`}
                className="m-1 size-5 rounded-full border border-neutral-300"
                style={{ background: c === 'transparent' ? 'linear-gradient(135deg, #fff 45%, #f87171 45% 55%, #fff 55%)' : c }}
                onClick={() =>
                  styleSelection({ backgroundColor: c, fillStyle: 'solid' }, { currentItemBackgroundColor: c, currentItemFillStyle: 'solid' })
                }
              />
            ))}
            <span className="mx-1 h-5 border-l border-neutral-200" />
            {FONTS.map(([family, label]) => (
              <button key={label} className={btn} onClick={() => styleSelection({ fontFamily: family }, { currentItemFontFamily: family })}>
                {label}
              </button>
            ))}
            <span className="mx-1 h-5 border-l border-neutral-200" />
            {SIZES.map((size) => (
              <button key={size} className={`${btn} tabular-nums`} onClick={() => styleSelection({ fontSize: size }, { currentItemFontSize: size })}>
                {size}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
