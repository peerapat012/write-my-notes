import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  Excalidraw,
  exportToBlob,
  exportToSvg,
  FONT_FAMILY,
  getSceneVersion,
  newElementWith,
  restoreElements,
  serializeAsJSON,
  viewportCoordsToSceneCoords,
} from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, ExcalidrawImperativeAPI, ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types'
import {
  ArrowLeft,
  ArrowRight,
  Circle,
  Diamond,
  Download,
  Eraser,
  FileText,
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
import { applyEdits, editTexts, selectedTexts } from '@/ai/edit'
import { createContent, type Mode } from '@/ai/create'
import { boundsOf, docsPrompt, placeRight } from '@/ai/docs'
import { boardTexts, summarize, summaryDoc } from '@/ai/summarize'
import type { BoardChat } from '@/features/chat/ChatTab'
import AiPanel from './AiPanel'
import DocCard from './DocCard'
import DocPicker from './DocPicker'
import { exportElements, toDisk } from './board'
import Menu from '@/components/Menu'
import { readBoard } from './readBoard'
import ConflictDialog from '@/components/ConflictDialog'
import { diskAction, dirty, flushes, type Vault } from '@/lib/fs'
import NameInput from '@/components/NameInput'
import IconPicker from '@/components/IconPicker'
import PageIcon from '@/components/PageIcon'
import { panel } from '@/components/ui'
import { relativePath, resolvePath, UNTITLED } from '@/lib/paths'
import { searchTexts, type BoardText } from '@/features/search/boardText'

type Props = { chatRef: React.RefObject<BoardChat | undefined>; docTexts: Map<string, string>; focusTitle: boolean; onIconChange: () => void; vault: Vault; zoomTo?: { id: string }; onSave: (texts: BoardText[]) => void; openSettings: () => void; path: string; dark: boolean; model: string; onSummary: (doc: string) => Promise<void>; go: (path: string) => void; onRename: (name: string) => void }
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
const DOC_CARD = { w: 380, h: 300 } // size of a new doc card

/** Path (relative to the board) of the doc a card shows: a v3 embeddable's `link`, or a v2 text card's `docPath`. */
const cardLink = (el: { type: string; link?: string | null; customData?: Record<string, any> }) =>
  el.type === 'embeddable' && el.link && !/^[a-z][a-z0-9+.-]*:/i.test(el.link) ? el.link : (el.customData?.docPath as string | undefined)

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
function boardFile(vault: Vault, path: string, onSave: (texts: BoardText[]) => void) {
  let api: ExcalidrawImperativeAPI | undefined
  let loaded = false
  let known = 0 // lastModified as of our last read or write
  let checking = false
  let icon: string | undefined
  let iconColor: string | undefined
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
    onSave(searchTexts(api!.getSceneElements()))
    writing = writing
      .then(async () => {
        for (const [id, f] of Object.entries(files))
          if (!links[id] && f.dataURL.startsWith('data:'))
            links = { ...links, [id]: relativePath(path, await vault.saveAsset(await (await fetch(f.dataURL)).blob())) }
        await vault.write(path, toDisk(json, icon, links, iconColor))
        known = await vault.stat(path)
      })
      .then(() => {
        if (!timer) dirty.delete(path)
      })
  }

  return {
    api: () => api,
    setApi: (a: ExcalidrawImperativeAPI) => void (api = a),
    /** Changes the page icon and writes the board right away. */
    setIcon(next?: string, color?: string) {
      icon = next
      iconColor = color
      save()
    },
    async load() {
      known = await vault.stat(path)
      const board = await readBoard(vault, path, await vault.read(path))
      loaded = true
      links = board.links
      icon = board.data.icon
      iconColor = board.data.iconColor
      return board.data
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
    /** Saves pending edits now; resolves once written. */
    flush() {
      if (timer) save()
      return writing
    },
    /** Window focus: reloads, or asks, if the file changed on disk since we last read or wrote it. */
    async check(ask: () => Promise<boolean>, reload: () => void) {
      if (!loaded || checking) return
      checking = true
      try {
        await writing
        const action = diskAction(known, await vault.stat(path), dirty.has(path))
        if (action !== 'ignore') {
          clearTimeout(timer) // no autosave over the disk version while we decide
          timer = undefined
          if (action === 'ask' && !(await ask())) save()
          else {
            dirty.delete(path)
            reload()
          }
        }
      } catch {
        // file deleted or renamed outside the app: nothing to compare against
      } finally {
        checking = false
      }
    },
  }
}

// Keyed by `rev` so a reload from disk remounts Excalidraw with fresh initialData.
export default function BoardPage(props: Props) {
  const [rev, setRev] = useState(0)
  return <Board key={rev} {...props} reload={() => setRev((r) => r + 1)} />
}

function Board({ chatRef, docTexts, focusTitle, onIconChange, vault, zoomTo, onSave, openSettings, path, dark, model, onSummary, go, onRename, reload }: Props & { reload: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const onSaveRef = useRef(onSave) // read by the autosave, which outlives App re-renders
  useEffect(() => {
    onSaveRef.current = onSave
  })
  const [board] = useState(() => boardFile(vault, path, (t) => onSaveRef.current(t)))
  const [icon, setIcon] = useState<string>()
  const [iconColor, setIconColor] = useState<string>()
  const [picker, setPicker] = useState<DOMRect>()
  const [docPicker, setDocPicker] = useState(false) // page picker for a new doc card
  const [ui, setUi] = useState({ tool: 'selection', zoom: 100, selected: 0 })
  const [emojis, setEmojis] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [exportAt, setExportAt] = useState<DOMRect>()
  const [ready, setReady] = useState(false) // first scene rendered; shows the loading state until then
  const [initialData] = useState(async (): Promise<ExcalidrawInitialDataState> => {
    const data = await board.load()
    setIcon(data.icon)
    setIconColor(data.iconColor)
    return { ...data, appState: { ...data.appState, ...DEFAULTS } }
  })

  const [conflict, setConflict] = useState<(loadDisk: boolean) => void>()

  useEffect(() => {
    flushes.add(board.flush)
    return () => {
      flushes.delete(board.flush)
      board.flush() // flush pending edits when leaving the page
    }
  }, [board])
  // The chat tab asks this board to generate content.
  useEffect(() => {
    chatRef.current = { create }
    return () => void (chatRef.current = undefined)
  })
  // A search hit: zoom to its element once the scene is up (and again for a new hit on the open board).
  useEffect(() => {
    const el = ready && zoomTo && board.api()?.getSceneElements().find((e) => e.id === zoomTo.id)
    if (el) board.api()!.scrollToContent(el, { fitToContent: true, animate: true })
  }, [board, ready, zoomTo])
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
    const next = { tool: app.activeTool.customType ?? app.activeTool.type, zoom: Math.round(z * 100), selected: Object.keys(app.selectedElementIds).length }
    setUi((u) => (u.tool === next.tool && u.zoom === next.zoom && u.selected === next.selected ? u : next))
    setReady(true)

    board.changed(elements)
  }

  /** Adds element skeletons to the scene and selects them. */
  function add(skeletons: Parameters<typeof convertToExcalidrawElements>[0]) {
    const a = board.api()!
    const added = convertToExcalidrawElements(skeletons)
    a.updateScene({
      elements: [...a.getSceneElementsIncludingDeleted(), ...added],
      appState: { selectedElementIds: Object.fromEntries(added.filter((e) => !('containerId' in e && e.containerId)).map((e) => [e.id, true])), activeTool: { ...a.getAppState().activeTool, type: 'selection', customType: null } } as AppState,
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    })
  }

  /** Sends the selected elements' text to Gemini and writes the answer back as one undo step. */
  async function editSelected(instruction: string) {
    const a = board.api()!
    const texts = selectedTexts(a.getSceneElements(), a.getAppState().selectedElementIds)
    if (!texts.length) throw new Error('Nothing to edit: the selection has no text.')
    const edits = await editTexts(model, instruction, texts)
    const elements = applyEdits(a.getSceneElementsIncludingDeleted(), edits)
    a.updateScene({
      elements: restoreElements(elements, null, { refreshDimensions: true, repairBindings: true }), // re-measure text boxes
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    })
  }

  /** Summarizes all text on the board into a new doc next to it, then opens that doc. */
  async function summarizeBoard() {
    const texts = boardTexts(board.api()!.getSceneElements())
    if (!texts.length) throw new Error('Nothing to summarize: the board has no text.')
    await onSummary(summaryDoc(path.slice(path.lastIndexOf('/') + 1), await summarize(model, texts)))
  }

  /** Downloads the selection (or the whole board) as PNG or SVG on a white background, light theme. */
  async function exportAs(type: 'png' | 'svg') {
    const a = board.api()!
    const state = a.getAppState()
    const opts = {
      elements: exportElements(a.getSceneElements(), state.selectedElementIds).flatMap((el) => (el.type === 'embeddable' ? cardBox(el) : [el])),
      appState: { ...state, exportBackground: true, viewBackgroundColor: '#ffffff', exportWithDarkMode: false },
      files: a.getFiles(),
    }
    const blob = type === 'png' ? await exportToBlob({ ...opts, mimeType: 'image/png' }) : new Blob([(await exportToSvg(opts)).outerHTML], { type: 'image/svg+xml' })
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${title}.${type}` })
    link.click()
    URL.revokeObjectURL(link.href)
  }

  /** A doc card in an export: a plain box with the doc's title (the live doc cannot be drawn into a PNG or SVG). */
  function cardBox(el: ExcalidrawElement) {
    const target = cardLink(el)
    const name = target ? resolvePath(path, target) : ''
    const title = name ? name.slice(name.lastIndexOf('/') + 1).replace(/\.md$/, '') : 'Doc'
    return convertToExcalidrawElements([
      { type: 'rectangle', x: el.x, y: el.y, width: el.width, height: el.height, backgroundColor: '#ffffff', fillStyle: 'solid', strokeColor: '#a3a3a3', roughness: 0, roundness: { type: 3 }, label: { text: docTexts.has(name) ? title : `Broken link: ${title}`, fontSize: 20, fontFamily: FONT_FAMILY.Nunito } },
    ] as never)
  }

  const center = () => {
    const { width, height, scrollX, scrollY, zoom } = board.api()!.getAppState()
    return { x: width / 2 / zoom.value - scrollX, y: height / 2 / zoom.value - scrollY }
  }

  /** Generates `mode` content from the prompt at the viewport centre; one undo step removes it. */
  async function create(mode: Mode, prompt: string, n: number) {
    const cards = selectedDocCards()
    if (!cards.length) {
      const { x, y } = center()
      return add((await createContent(model, mode, prompt, n, x, y)) as never)
    }
    // Selected doc cards are the input; the result goes to the right of them.
    const made = await createContent(model, mode, docsPrompt(prompt, cards.map(({ title, text }) => ({ title, text }))), n, 0, 0)
    add(placeRight(made, boundsOf(cards.map((c) => c.el))) as never)
  }

  /** The doc cards in the selection, with their titles and current text. */
  function selectedDocCards() {
    const a = board.api()
    if (!a) return []
    const selected = a.getAppState().selectedElementIds
    return a.getSceneElements().flatMap((el) => {
      const link = selected[el.id] ? cardLink(el) : undefined
      if (!link) return []
      const doc = resolvePath(path, link)
      return [{ el, title: doc.slice(doc.lastIndexOf('/') + 1).replace(/\.md$/, ''), text: docTexts.get(doc) ?? '' }]
    })
  }

  function placeEmoji(emoji: string) {
    setEmojis(false)
    const { x, y } = center()
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

  /** Adds a doc card (an embeddable whose `link` is the doc's path relative to this board) centred on (x, y). */
  function addDocCard(doc: string, x: number, y: number) {
    // The converter leaves the style fields undefined on an embeddable, and Excalidraw's selection panel then crashes
    // (white screen: `isTransparent`, `getSelectedGroupForElement`), so every one is set.
    const style = { backgroundColor: 'transparent', strokeColor: 'transparent', fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid', roughness: 0, opacity: 100, angle: 0, groupIds: [], frameId: null, roundness: null, boundElements: null, locked: false }
    add([{ type: 'embeddable', ...style, x: x - DOC_CARD.w / 2, y: y - DOC_CARD.h / 2, width: DOC_CARD.w, height: DOC_CARD.h, link: relativePath(path, doc) }] as never)
  }

  // Sidebar drag (`text/x-page`, ticket 08) of a doc onto the board: add a doc card where it was dropped.
  function dropDoc(e: React.DragEvent) {
    const doc = e.dataTransfer.getData('text/x-page')
    if (!doc.endsWith('.md')) return
    e.preventDefault()
    e.stopPropagation() // keep Excalidraw's own drop handler out of it
    const { x, y } = viewportCoordsToSceneCoords(e, board.api()!.getAppState())
    addDocCard(doc, x, y)
  }

  // Double-click on a doc card opens its doc (instead of Excalidraw's text editing).
  function openCard(e: React.MouseEvent) {
    const a = board.api()!
    const { x, y } = viewportCoordsToSceneCoords(e, a.getAppState())
    const card = a.getSceneElements().findLast((el) => cardLink(el) && x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height)
    if (!card) return
    e.stopPropagation()
    const target = resolvePath(path, cardLink(card)!)
    vault.stat(target).then(() => go(target), () => {}) // broken card: stay
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

  const btn =
    'grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-neutral-500 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40'
  function changeIcon(next?: string, color?: string) {
    const c = next?.startsWith('lucide:') ? color : undefined
    setIcon(next)
    setIconColor(c)
    board.setIcon(next, c)
    onIconChange()
  }

  const textBtn = `${btn} text-[13px] font-medium text-neutral-700`
  const title = path.slice(path.lastIndexOf('/') + 1, -'.excalidraw'.length)
  return (
    <div className="board flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-1 border-b border-neutral-200 px-2">
        <button className={btn} title="Back" aria-label="Back" onClick={() => history.back()}>
          <ArrowLeft size={16} />
        </button>
        <h1 className="mr-auto flex min-w-0 items-center gap-1 px-1 font-medium">
          <button
            className="grid size-7 shrink-0 place-items-center rounded-md transition-colors duration-150 hover:bg-neutral-100"
            title={icon ? 'Change icon' : 'Add icon'}
            aria-label={icon ? 'Change icon' : 'Add icon'}
            onClick={(e) => setPicker(e.currentTarget.getBoundingClientRect())}
          >
            <PageIcon icon={icon} color={iconColor} fallback={Presentation} size={18} />
          </button>
          <NameInput
            value={UNTITLED.test(title) ? '' : title}
            placeholder="Title"
            autoFocus={focusTitle}
            onDone={(name) => name && name !== title && onRename(name)}
            className="h-7 min-w-0 rounded-md bg-transparent px-1.5 transition-colors duration-150 hover:bg-neutral-100"
          />
        </h1>
        <button className={btn} title="Undo (Ctrl+Z)" aria-label="Undo" onClick={() => keys('KeyZ', 'z')}>
          <Undo2 size={16} />
        </button>
        <button className={btn} title="Redo (Ctrl+Shift+Z)" aria-label="Redo" onClick={() => keys('KeyZ', 'Z', true)}>
          <Redo2 size={16} />
        </button>
        <span className="mx-1.5 h-5 border-l border-neutral-200" />
        <button className={btn} title="Zoom out" aria-label="Zoom out" onClick={() => keys('Minus', '-')}>
          <Minus size={16} />
        </button>
        <button className={`${btn} w-14 tabular-nums`} title="Reset zoom" onClick={() => keys('Digit0', '0')}>
          {ui.zoom}%
        </button>
        <button className={btn} title="Zoom in" aria-label="Zoom in" onClick={() => keys('Equal', '=')}>
          <Plus size={16} />
        </button>
        <span className="mx-1.5 h-5 border-l border-neutral-200" />
        <button className={textBtn} title="AI" aria-expanded={aiOpen} onClick={() => setAiOpen((o) => !o)}>
          <span className="flex items-center gap-1.5">
            <Sparkles size={16} /> AI
          </span>
        </button>
        <button className={textBtn} title="Export" aria-haspopup="menu" onClick={(e) => setExportAt(e.currentTarget.getBoundingClientRect())}>
          <span className="flex items-center gap-1.5">
            <Download size={16} /> Export
          </span>
        </button>
      </header>
      {docPicker && (
        <DocPicker
          docs={[...docTexts.keys()].sort((a, b) => a.localeCompare(b))}
          onClose={() => setDocPicker(false)}
          onPick={(doc) => {
            setDocPicker(false)
            const { x, y } = center()
            addDocCard(doc, x, y)
          }}
        />
      )}
      {picker && (<IconPicker anchor={picker} icon={icon} color={iconColor} onChange={changeIcon} onClose={() => setPicker(undefined)} />)}
      <div
        ref={box}
        className="relative flex-1"
        onDragOverCapture={(e) => e.dataTransfer.types.includes('text/x-page') && e.preventDefault()}
        onDropCapture={dropDoc}
        onDoubleClickCapture={openCard}
        style={{ backgroundImage: 'radial-gradient(var(--grid-dot) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      >
        {!ready && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-white">
            <div className="flex animate-pulse items-center gap-2 text-neutral-500">
              <Presentation size={16} /> Opening board…
            </div>
          </div>
        )}
        <Excalidraw
          excalidrawAPI={board.setApi}
          initialData={initialData}
          onChange={onChange}
          onPointerUp={onPointerUp}
          validateEmbeddable={(link) => (cardLink({ type: 'embeddable', link }) ? true : undefined)}
          renderEmbeddable={(el) => {
            const link = cardLink(el)
            return link ? <DocCard vault={vault} board={path} link={link} text={docTexts.get(resolvePath(path, link))} /> : null
          }}
          onLinkOpen={(el, event) => {
            const link = cardLink(el)
            if (!link) return
            event.preventDefault() // a doc card's link is a page, not a URL
            const target = resolvePath(path, link)
            vault.stat(target).then(() => go(target), () => {})
          }}
          theme={dark ? 'dark' : 'light'}
          UIOptions={{
            canvasActions: { changeViewBackgroundColor: false, clearCanvas: false, export: false, loadScene: false, saveToActiveFile: false, toggleTheme: false, saveAsImage: false },
          }}
        />
        <nav aria-label="Tools" className={`${panel} absolute top-1/2 left-3 z-10 flex -translate-y-1/2 flex-col gap-0.5 p-1`}>
          {TOOLS.map(([type, Icon, label]) => (
            <button
              key={type}
              title={label}
              aria-label={label}
              aria-pressed={ui.tool === type}
              className={`${btn} ${ui.tool === type ? 'bg-neutral-200 text-neutral-900 hover:bg-neutral-200' : ''}`}
              onClick={() => board.api()?.setActiveTool(type === 'sticky' ? { type: 'custom', customType: type } : ({ type } as never))}
            >
              <Icon size={16} />
            </button>
          ))}
          <button title="Doc card" aria-label="Doc card" className={btn} onClick={() => setDocPicker(true)}>
            <FileText size={16} />
          </button>
          <button
            title="Emoji"
            aria-label="Emoji"
            aria-expanded={emojis}
            className={`${btn} ${emojis ? 'bg-neutral-200 text-neutral-900' : ''}`}
            onClick={() => setEmojis((o) => !o)}>
            <Smile size={16} />
          </button>
          <button
            title="Image (or paste)"
            aria-label="Image"
            className={btn}
            onClick={() => board.api()?.setActiveTool({ type: 'image', insertOnCanvasDirectly: true })}
          >
            <Image size={16} />
          </button>
        </nav>
        {emojis && (
          <div
            className={`${panel} absolute top-1/2 left-17 z-10 grid -translate-y-1/2 grid-cols-6 gap-0.5 p-1.5 text-xl transition-[opacity,translate] duration-150 ease-out starting:-translate-x-1 starting:opacity-0`}
          >
            {EMOJIS.map((e) => (
              <button key={e} className="grid size-9 place-items-center rounded-md transition-colors duration-150 hover:bg-neutral-100" aria-label={e} onClick={() => placeEmoji(e)}>
                {e}
              </button>
            ))}
          </div>
        )}
        {aiOpen && <AiPanel docs={selectedDocCards().map((c) => c.title)} selected={ui.selected} onEdit={editSelected} onCreate={create} onSummarize={summarizeBoard} openSettings={openSettings} />}
        {ui.selected > 0 && (
          <div
            className={`${panel} absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 p-1 transition-[opacity,translate] duration-150 ease-out starting:-translate-y-1 starting:opacity-0`}
          >
            {FILLS.map((c) => (
              <button
                key={c}
                title={c === 'transparent' ? 'No fill' : c}
                aria-label={`Fill ${c}`}
                className="m-1 size-5 rounded-full border border-neutral-300 transition-transform duration-150 hover:scale-110"
                style={{ background: c === 'transparent' ? 'linear-gradient(135deg, #fff 45%, #f87171 45% 55%, #fff 55%)' : c }}
                onClick={() =>
                  styleSelection({ backgroundColor: c, fillStyle: 'solid' }, { currentItemBackgroundColor: c, currentItemFillStyle: 'solid' })
                }
              />
            ))}
            <span className="mx-1 h-5 border-l border-neutral-200" />
            {FONTS.map(([family, label]) => (
              <button key={label} className={textBtn} onClick={() => styleSelection({ fontFamily: family }, { currentItemFontFamily: family })}>
                {label}
              </button>
            ))}
            <span className="mx-1 h-5 border-l border-neutral-200" />
            {SIZES.map((size) => (
              <button key={size} className={`${textBtn} tabular-nums`} onClick={() => styleSelection({ fontSize: size }, { currentItemFontSize: size })}>
                {size}
              </button>
            ))}
          </div>
        )}
      </div>
      {exportAt && (
        <Menu
          label="Export"
          anchor={exportAt}
          onClose={() => setExportAt(undefined)}
          groups={[
            {
              label: ui.selected ? `Export ${ui.selected} selected` : 'Export whole board',
              items: [
                { label: 'PNG', icon: Image, onSelect: () => exportAs('png') },
                { label: 'SVG', icon: Download, onSelect: () => exportAs('svg') },
              ],
            },
          ]}
        />
      )}
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
