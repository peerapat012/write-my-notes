import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  Excalidraw,
  FONT_FAMILY,
  getSceneVersion,
  newElementWith,
  restoreElements,
  serializeAsJSON,
} from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI, ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types'
import {
  ArrowLeft,
  ArrowRight,
  Circle,
  Diamond,
  Download,
  Eraser,
  Hand,
  Image,
  type LucideIcon,
  Minus,
  MousePointer2,
  Pencil,
  Plus,
  Presentation,
  Redo2,
  Slash,
  Smile,
  Sparkles,
  Square,
  StickyNote,
  Type,
  Undo2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { swapURLs, toDisk } from './board'
import ConflictDialog from './ConflictDialog'
import { diskAction, dirty, getFile, saveAsset, writeFile } from './fs'
import { relativePath, resolvePath } from './paths'

type Props = { root: FileSystemDirectoryHandle; path: string }
type Tool = Parameters<ExcalidrawImperativeAPI['setActiveTool']>[0]['type']

const TOOLS: [Tool | 'sticky', LucideIcon, string][] = [
  ['selection', MousePointer2, 'Select (V)'],
  ['hand', Hand, 'Hand (H)'],
  ['text', Type, 'Text (T)'],
  ['freedraw', Pencil, 'Pen (P)'],
  ['sticky', StickyNote, 'Sticky note (click to place)'],
  ['rectangle', Square, 'Rectangle (R)'],
  ['ellipse', Circle, 'Ellipse (O)'],
  ['diamond', Diamond, 'Diamond (D)'],
  ['line', Slash, 'Line (L)'],
  ['arrow', ArrowRight, 'Arrow (A)'],
  ['eraser', Eraser, 'Eraser (E)'],
]
const EMOJIS = '😀 😂 😍 🤔 😎 😢 😡 👍 👎 👏 🙏 💪 🔥 ⭐ ❤️ ✅ ❌ ⚠️ ❓ 💡 🎉 🚀 📌 📝'.split(' ')
const STICKY = 200

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
  let file: FileSystemFileHandle | undefined
  let known = 0 // lastModified as of our last read or write
  let checking = false
  let icon: string | undefined
  let links: Record<string, string> = {} // fileId -> relative `assets/` link already on disk
  let version: number | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let writing = Promise.resolve()

  function save() {
    clearTimeout(timer)
    timer = undefined
    const app = { ...api!.getAppState(), viewBackgroundColor: '#ffffff' }
    const files = api!.getFiles()
    const json = serializeAsJSON(api!.getSceneElements(), app, files, 'local')
    writing = writing
      .then(async () => {
        for (const [id, f] of Object.entries(files))
          if (!links[id] && f.dataURL.startsWith('data:'))
            links = { ...links, [id]: relativePath(path, await saveAsset(root, await (await fetch(f.dataURL)).blob())) }
        await writeFile(file!, toDisk(json, icon, links))
        known = (await file!.getFile()).lastModified
      })
      .then(() => {
        if (!timer) dirty.delete(path)
      })
  }

  return {
    api: () => api,
    setApi: (a: ExcalidrawImperativeAPI) => void (api = a),
    async load() {
      file = await getFile(root, path)
      const disk = await file.getFile()
      known = disk.lastModified
      const data = JSON.parse(await disk.text())
      icon = data.icon
      const urls: Record<string, string> = {}
      for (const [id, f] of Object.entries((data.files ?? {}) as BinaryFiles)) {
        if (f.dataURL.startsWith('data:')) continue
        links[id] = f.dataURL
        try {
          urls[id] = await dataURL(await (await getFile(root, resolvePath(path, f.dataURL))).getFile())
        } catch {
          console.warn('missing board image', f.dataURL) // keep the link so the next save doesn't drop it
        }
      }
      return { ...data, files: swapURLs(data.files ?? {}, urls) }
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
    /** Window focus: reloads, or asks, if the file changed on disk since we last read or wrote it. */
    async check(ask: () => Promise<boolean>, reload: () => void) {
      if (!file || checking) return
      checking = true
      await writing
      const action = diskAction(known, (await file.getFile()).lastModified, dirty.has(path))
      if (action !== 'ignore') {
        clearTimeout(timer) // no autosave over the disk version while we decide
        timer = undefined
        if (action === 'ask' && !(await ask())) save()
        else {
          dirty.delete(path)
          reload()
        }
      }
      checking = false
    },
  }
}

const dataURL = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })

// Keyed by `rev` so a reload from disk remounts Excalidraw with fresh initialData.
export default function BoardPage(props: Props) {
  const [rev, setRev] = useState(0)
  return <Board key={rev} {...props} reload={() => setRev((r) => r + 1)} />
}

function Board({ root, path, reload }: Props & { reload: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [board] = useState(() => boardFile(root, path))
  const [icon, setIcon] = useState<string>()
  const [ui, setUi] = useState({ tool: 'selection', zoom: 100, selected: false })
  const [emojis, setEmojis] = useState(false)
  const [initialData] = useState(async (): Promise<ExcalidrawInitialDataState> => {
    const data = await board.load()
    setIcon(data.icon)
    return { ...data, appState: { ...data.appState, ...DEFAULTS } }
  })

  const [conflict, setConflict] = useState<(loadDisk: boolean) => void>()

  useEffect(() => board.flush, [board]) // flush pending edits when leaving the page
  useEffect(() => {
    const onFocus = () => board.check(() => new Promise((r) => setConflict(() => r)), reload)
    addEventListener('focus', onFocus)
    return () => removeEventListener('focus', onFocus)
  }, [board, reload])

  function onChange(elements: readonly ExcalidrawElement[], app: AppState) {
    const z = app.zoom.value
    const style = box.current!.style
    style.backgroundSize = `${20 * z}px ${20 * z}px`
    style.backgroundPosition = `${app.scrollX * z}px ${app.scrollY * z}px`
    const next = { tool: app.activeTool.customType ?? app.activeTool.type, zoom: Math.round(z * 100), selected: Object.keys(app.selectedElementIds).length > 0 }
    setUi((u) => (u.tool === next.tool && u.zoom === next.zoom && u.selected === next.selected ? u : next))

    board.changed(elements)
  }

  /** Adds element skeletons to the scene and selects them. */
  function add(skeletons: Parameters<typeof convertToExcalidrawElements>[0]) {
    const a = board.api()!
    const added = convertToExcalidrawElements(skeletons)
    a.updateScene({
      elements: [...a.getSceneElementsIncludingDeleted(), ...added],
      appState: { selectedElementIds: { [added[0].id]: true }, activeTool: { ...a.getAppState().activeTool, type: 'selection', customType: null } } as AppState,
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    })
  }

  function placeEmoji(emoji: string) {
    setEmojis(false)
    const { width, height, scrollX, scrollY, zoom } = board.api()!.getAppState()
    const x = width / 2 / zoom.value - scrollX
    const y = height / 2 / zoom.value - scrollY
    add([{ type: 'text', text: emoji, fontSize: 64, x: x - 40, y: y - 40 }])
  }

  // Sticky tool: Excalidraw's custom tool does nothing on its own; we place the note on pointer up.
  function onPointerUp(tool: AppState['activeTool'], state: { origin: { x: number; y: number } }) {
    if (tool.customType !== 'sticky') return
    const c = board.api()!.getAppState().currentItemBackgroundColor
    add([
      {
        type: 'rectangle',
        x: state.origin.x - STICKY / 2,
        y: state.origin.y - STICKY / 2,
        width: STICKY,
        height: STICKY,
        backgroundColor: c === 'transparent' ? FILLS[1] : c,
        fillStyle: 'solid',
        strokeColor: 'transparent',
        roughness: 0,
        roundness: { type: 3 },
      },
    ])
    // Enter on a selected shape opens its bound text editor, so the user can type right away.
    requestAnimationFrame(() =>
      box.current!.querySelector('.excalidraw')!.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true })),
    )
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
          <ArrowLeft size={18} />
        </button>
        <h1 className="mr-auto flex items-center gap-1.5 truncate px-2 font-medium">
          {icon ?? <Presentation size={18} />} {title}
        </h1>
        <button className={btn} title="Undo (Ctrl+Z)" aria-label="Undo" onClick={() => keys('KeyZ', 'z')}>
          <Undo2 size={18} />
        </button>
        <button className={btn} title="Redo (Ctrl+Shift+Z)" aria-label="Redo" onClick={() => keys('KeyZ', 'Z', true)}>
          <Redo2 size={18} />
        </button>
        <span className="mx-2 h-5 border-l border-neutral-200" />
        <button className={btn} title="Zoom out" aria-label="Zoom out" onClick={() => keys('Minus', '-')}>
          <Minus size={18} />
        </button>
        <button className={`${btn} w-14 tabular-nums`} title="Reset zoom" onClick={() => keys('Digit0', '0')}>
          {ui.zoom}%
        </button>
        <button className={btn} title="Zoom in" aria-label="Zoom in" onClick={() => keys('Equal', '=')}>
          <Plus size={18} />
        </button>
        <span className="mx-2 h-5 border-l border-neutral-200" />
        <button className={btn} disabled title="AI (coming soon)">
          <span className="flex items-center gap-1.5">
            <Sparkles size={16} /> AI
          </span>
        </button>
        <button className={btn} disabled title="Export (coming soon)">
          <span className="flex items-center gap-1.5">
            <Download size={16} /> Export
          </span>
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
          onPointerUp={onPointerUp}
          UIOptions={{
            canvasActions: { changeViewBackgroundColor: false, clearCanvas: false, export: false, loadScene: false, saveToActiveFile: false, toggleTheme: false, saveAsImage: false },
          }}
        />
        <nav className="absolute top-1/2 left-3 z-10 flex -translate-y-1/2 flex-col gap-1 rounded-lg border border-neutral-200 bg-white p-1 shadow-sm">
          {TOOLS.map(([type, Icon, label]) => (
            <button
              key={type}
              title={label}
              aria-label={label}
              aria-pressed={ui.tool === type}
              className={`${btn} ${ui.tool === type ? 'bg-neutral-200 hover:bg-neutral-200' : ''}`}
              onClick={() => board.api()?.setActiveTool(type === 'sticky' ? { type: 'custom', customType: type } : ({ type } as never))}
            >
              <Icon size={18} />
            </button>
          ))}
          <button title="Emoji" aria-label="Emoji" aria-expanded={emojis} className={btn} onClick={() => setEmojis((o) => !o)}>
            <Smile size={18} />
          </button>
          <button
            title="Image (or paste)"
            aria-label="Image"
            className={btn}
            onClick={() => board.api()?.setActiveTool({ type: 'image', insertOnCanvasDirectly: true })}
          >
            <Image size={18} />
          </button>
        </nav>
        {emojis && (
          <div className="absolute top-1/2 left-16 z-10 grid w-56 -translate-y-1/2 grid-cols-6 gap-1 rounded-lg border border-neutral-200 bg-white p-1 text-xl shadow-sm">
            {EMOJIS.map((e) => (
              <button key={e} className="grid size-8 place-items-center rounded hover:bg-neutral-100" aria-label={e} onClick={() => placeEmoji(e)}>
                {e}
              </button>
            ))}
          </div>
        )}
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
      {conflict && (
        <ConflictDialog
          name={title}
          onAnswer={(loadDisk) => {
            setConflict(undefined)
            conflict(loadDisk)
          }}
        />
      )}
    </div>
  )
}
