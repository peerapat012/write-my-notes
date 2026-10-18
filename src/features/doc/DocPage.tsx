import { Crepe, CrepeFeature } from '@milkdown/crepe'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'
import { exportToSvg } from '@excalidraw/excalidraw'
import { commandsCtx, editorViewCtx, parserCtx, remarkStringifyOptionsCtx } from '@milkdown/kit/core'
import type { Ctx } from '@milkdown/kit/ctx'
import { getMarkdown, replaceAll, replaceRange } from '@milkdown/kit/utils'
import { addBlockTypeCommand, clearTextInCurrentBlockCommand, codeBlockSchema } from '@milkdown/kit/preset/commonmark'
import { syntaxHighlighting } from '@codemirror/language'
import { classHighlighter } from '@lezer/highlight'
import { CalendarClock, ChevronRight, Code, Copy, Heading1, Heading2, Heading3, List, ListOrdered, ListTodo, Pilcrow, Quote, SmilePlus, Tag, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ConflictDialog from '@/components/ConflictDialog'
import IconPicker from '@/components/IconPicker'
import PageIcon from '@/components/PageIcon'
import Menu, { type MenuGroup } from '@/components/Menu'
import { diskAction, dirty, flushes, type Vault } from '@/lib/fs'
import DocAi from './DocAi'
import { duplicate, remove, turnInto, type BlockKind } from './blockActions'
import { getProps, setIcon, setTags, splitFrontMatter } from './frontmatter'
import { mermaidPreview } from './mermaid'
import { localDate } from '@/features/templates/daily'
import TemplatePicker from '@/features/templates/TemplatePicker'
import { fromTemplate } from '@/features/templates/templates'
import { headings, type Heading } from './outline'
import { NEW_TASKS } from './tasks'
import { tasksView } from './tasksView'
import { countWords } from './wordCount'
import { linkTarget } from '@/lib/links'
import NameInput from '@/components/NameInput'
import { skeleton } from '@/components/ui'
import { relativePath, resolvePath, UNTITLED } from '@/lib/paths'
import { readBoard } from '@/features/board/readBoard'
import { parseIcon, parseIconColor } from '@/features/sidebar/tree'

/** Shown in place of a board embed whose `.excalidraw` file is missing. */
const INFO_KEY = 'write-my-notes:info' // the Info box is open or closed for every page at once

const brokenBoard = (name: string) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="64"><rect x="1" y="1" width="478" height="62" rx="6" fill="#fef2f2" stroke="#dc2626" stroke-dasharray="6 4"/><text x="240" y="37" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#dc2626">Broken link: board “${name.replace(/[<>&]/g, '')}” not found</text></svg>`,
  )

/** Blob URL of an SVG preview of board `path`; `previews` maps it back to the board for click-to-open. */
async function boardPreview(vault: Vault, path: string, previews: Map<string, string>) {
  try {
    const { data } = await readBoard(vault, path, await vault.read(path))
    const svg = await exportToSvg({ elements: data.elements, appState: { ...data.appState, exportBackground: true, viewBackgroundColor: '#ffffff' }, files: data.files })
    const url = URL.createObjectURL(new Blob([svg.outerHTML], { type: 'image/svg+xml' }))
    previews.set(url, path)
    return url
  } catch {
    return brokenBoard(path.slice(path.lastIndexOf('/') + 1))
  }
}

/** Slash menu icon (lucide "workflow"); Crepe wants SVG markup, not a component. */
const MERMAID_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/></svg>'

/** Slash menu icon (lucide "list-checks"). */
const TASKS_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>'

/** Slash menu and toolbar icon (lucide "sparkles"). */
const AI_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>'

const TURN_INTO: [BlockKind, string, MenuGroup['items'][number]['icon']][] = [
  ['text', 'Text', Pilcrow],
  ['h1', 'Heading 1', Heading1],
  ['h2', 'Heading 2', Heading2],
  ['h3', 'Heading 3', Heading3],
  ['bullet', 'Bulleted list', List],
  ['numbered', 'Numbered list', ListOrdered],
  ['todo', 'To-do list', ListTodo],
  ['quote', 'Quote', Quote],
  ['code', 'Code', Code],
]

type Props = {
  vault: Vault
  dark: boolean // diagram theme; a change rebuilds the editor to re-render them
  path: string
  exists: Set<string> // every path in the notes folder, for broken-link marks
  go: (path: string) => void
  onRename: (name: string) => void
  onIconChange: () => void
  onSave: (text: string) => void // keeps the search index current
  onHeadings: (headings: Heading[]) => void // feeds the outline panel
  model: string // Gemini model for `/ai`
  openSettings: () => void
  focusTitle: boolean // a page just created: the title takes focus
}

export default function DocPage({ vault, dark, path, exists, go, onRename, onIconChange, onSave, onHeadings, model, openSettings, focusTitle }: Props) {
  const mount = useRef<HTMLDivElement>(null)
  const save = useRef<(patch?: (front: string) => string) => Promise<void>>(async () => {})
  const [icon, setIconState] = useState<string>()
  const [iconColor, setIconColor] = useState<string>()
  const [picker, setPicker] = useState<DOMRect>() // icon picker popover
  const [templates, setTemplates] = useState(false) // template picker, opened from the Start row
  const [empty, setEmpty] = useState(false) // no text yet: the Add icon link stays visible
  const [info, setInfo] = useState(() => localStorage.getItem(INFO_KEY) === 'open')
  const [props, setProps] = useState<ReturnType<typeof getProps>>({ created: undefined, tags: [] })
  const [ready, setReady] = useState(false) // editor created; shows the loading state until then
  const [rev, setRev] = useState(0) // bumped to reload the file from disk
  const [conflict, setConflict] = useState<(loadDisk: boolean) => void>()
  const [broken, setBroken] = useState('') // CSS selector list of links whose target is missing
  const previews = useRef(new Map<string, string>()) // board preview blob URL -> board path
  const editor = useRef<Crepe>(undefined)
  const [blockMenu, setBlockMenu] = useState<{ at: DOMRect; footer: string }>() // drag handle click menu
  const [ai, setAi] = useState<{ at: DOMRect; from: number; to: number; selection: string; block?: boolean }>() // `/ai` popover
  const onSaveRef = useRef(onSave) // read by the load effect, which must not re-run when App re-renders
  const onHeadingsRef = useRef(onHeadings)
  useEffect(() => {
    onSaveRef.current = onSave
    onHeadingsRef.current = onHeadings
  })

  useEffect(() => {
    let crepe: Crepe | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false
    let loaded = false
    let known = 0 // lastModified as of our last read or write
    let writing = Promise.resolve()
    let checking = false

    async function onFocus() {
      if (!loaded || checking) return
      checking = true
      try {
        await writing
        const action = diskAction(known, await vault.stat(path), dirty.has(path))
        if (action !== 'ignore') {
          clearTimeout(timer) // no autosave over the disk version while we decide
          timer = undefined
          if (action === 'ask' && !(await new Promise<boolean>((r) => setConflict(() => r)))) save.current()
          else {
            dirty.delete(path)
            setRev((r) => r + 1)
          }
        }
      } catch {
        // file deleted or renamed outside the app: nothing to compare against
      } finally {
        checking = false
      }
    }

    ;(async () => {
      const mtime = await vault.stat(path) // before the read: a change in between makes the next focus check reload
      const text = await vault.read(path)
      if (cancelled) return
      known = mtime
      let { front, body } = splitFrontMatter(text)
      setIconState(parseIcon(path, text))
      setIconColor(parseIconColor(path, text))
      setEmpty(!body.trim())
      setProps(getProps(front))

      crepe = new Crepe({
        root: mount.current,
        defaultValue: body,
        featureConfigs: {
          // Token classes (tok-keyword, ...) coloured from theme variables in index.css, so code follows the theme.
          [CrepeFeature.CodeMirror]: { theme: syntaxHighlighting(classHighlighter), renderPreview: mermaidPreview(dark) },
          [CrepeFeature.Toolbar]: {
            buildToolbar: (b) => b.getGroup('function').addItem('ai', { icon: AI_ICON, label: 'AI', active: () => false, onRun: (ctx) => openAi(ctx) }),
          },
          [CrepeFeature.BlockEdit]: {
            buildMenu: (b) =>
              b.getGroup('advanced').addItem('ai', {
                label: 'AI',
                icon: AI_ICON,
                onRun: (ctx) => {
                  ctx.get(commandsCtx).call(clearTextInCurrentBlockCommand.key)
                  openAi(ctx)
                },
              }).addItem('tasks', {
                label: 'Tasks',
                icon: TASKS_ICON,
                onRun: (ctx: Ctx) => {
                  const commands = ctx.get(commandsCtx)
                  commands.call(clearTextInCurrentBlockCommand.key)
                  commands.call(addBlockTypeCommand.key, { nodeType: codeBlockSchema.type(ctx), attrs: { language: 'tasks' } })
                  const view = ctx.get(editorViewCtx)
                  view.dispatch(view.state.tr.insertText(NEW_TASKS))
                },
              }).addItem('mermaid', {
                label: 'Mermaid',
                icon: MERMAID_ICON,
                onRun: (ctx: Ctx) => {
                  const commands = ctx.get(commandsCtx)
                  commands.call(clearTextInCurrentBlockCommand.key)
                  commands.call(addBlockTypeCommand.key, { nodeType: codeBlockSchema.type(ctx), attrs: { language: 'mermaid' } })
                },
              }),
          },
          [CrepeFeature.Placeholder]: { text: 'Write, or type / for commands' },
          [CrepeFeature.ImageBlock]: {
            onUpload: async (image) => relativePath(path, await vault.saveAsset(image)),
            // ponytail: blob URLs are never revoked; fine per page view, revoke on unmount if memory grows.
            proxyDomURL: async (url) =>
              /^[a-z]+:/i.test(url)
                ? url
                : resolvePath(path, url).endsWith('.excalidraw')
                  ? boardPreview(vault, resolvePath(path, url), previews.current)
                  : vault.readBlob(resolvePath(path, url)).then(URL.createObjectURL, () => url),
          },
        },
      })
      crepe.editor.use(tasksView)
      // Match common hand-written markdown so saves don't churn git diffs.
      crepe.editor.config((ctx) => ctx.update(remarkStringifyOptionsCtx, (o) => ({ ...o, bullet: '-' as const, rule: '-' as const })))
      crepe.on((l) =>
        l.markdownUpdated((_, markdown) => {
          onHeadingsRef.current(headings(markdown))
          setEmpty(!markdown.trim())
          dirty.add(path)
          clearTimeout(timer)
          timer = setTimeout(() => save.current(), 500)
        }),
      )
      await crepe.create()
      if (!cancelled) {
        setReady(true)
        onHeadingsRef.current(headings(body))
      }
      editor.current = crepe
      loaded = true

      save.current = (patch) => {
        clearTimeout(timer)
        timer = undefined
        if (patch) front = patch(front)
        // Image blocks store their resize ratio as alt text; drop the default so plain `![](...)` stays plain.
        const content = front + crepe!.getMarkdown().replace(/!\[1\.00\]\(/g, '![](')
        onSaveRef.current(content)
        writing = writing
          .then(() => vault.write(path, content))
          .then(async () => {
            known = await vault.stat(path)
            if (!timer) dirty.delete(path)
          })
        return writing
      }
    })()

    const flush = () => (timer ? save.current() : writing)
    flushes.add(flush)
    addEventListener('focus', onFocus)
    return () => {
      flushes.delete(flush)
      removeEventListener('focus', onFocus)
      cancelled = true
      if (timer) save.current() // flush pending edits when leaving the page
      editor.current = undefined
      onHeadingsRef.current([])
      crepe?.destroy()
    }
  }, [vault, path, rev, dark])

  // Find links whose target is missing as the editor re-renders and as the folder changes. Styled from a
  // <style> rule, not by touching the editor DOM: ProseMirror would treat attribute changes as edits.
  useEffect(() => {
    const el = mount.current!
    const mark = () => {
      const hrefs = [...el.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')!)
      const missing = hrefs.filter((h) => {
        const target = linkTarget(path, h)
        return target !== undefined && !exists.has(target)
      })
      setBroken([...new Set(missing)].map((h) => `main .milkdown a[href="${CSS.escape(h)}"]`).join(','))
    }
    const observer = new MutationObserver(mark)
    observer.observe(el, { childList: true, subtree: true })
    mark()
    return () => observer.disconnect()
  }, [path, exists])

  function openLink(e: React.MouseEvent) {
    // Crepe's drag handle (the second handle button) selects its block on mousedown; a click opens the block menu.
    const handle = (e.target as Element).closest('.milkdown-block-handle .operation-item:last-child')
    if (handle && editor.current) {
      const { words, characters } = countWords(editor.current.getMarkdown())
      const at = handle.getBoundingClientRect()
      // After the frame in which the block plugin re-focuses the editor, so the menu keeps focus.
      requestAnimationFrame(() => setBlockMenu({ at, footer: `${words} words, ${characters} characters` }))
      return
    }
    const board = previews.current.get((e.target as HTMLElement).closest('img')?.src ?? '')
    if (board) return go(board)
    const href = (e.target as HTMLElement).closest('a')?.getAttribute('href')
    const target = href ? linkTarget(path, href) : undefined
    if (target && exists.has(target)) {
      e.preventDefault()
      go(target)
    }
  }

  /** Opens the AI popover on the current selection, or at the cursor when nothing is selected. */
  function openAi(ctx: Ctx) {
    const view = ctx.get(editorViewCtx)
    const { from, to, $from, empty } = view.state.selection
    const c = view.coordsAtPos(from)
    const at = new DOMRect(c.left, c.top, 0, c.bottom - c.top)
    // On an empty line, replace the whole block, so a list or heading answer isn't merged into the paragraph.
    if (empty && !$from.parent.content.size && $from.depth) setAi({ at, from: $from.before(), to: $from.after(), selection: '', block: true })
    else setAi({ at, from, to, selection: empty ? '' : getMarkdown({ from, to })(ctx) })
  }

  function closeAi(markdown?: string) {
    const range = ai!
    setAi(undefined)
    editor.current?.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      // A whole empty block takes the parsed blocks as they are; a selection or cursor gets an open slice that merges in.
      if (markdown !== undefined && range.block) view.dispatch(view.state.tr.replaceWith(range.from, range.to, ctx.get(parserCtx)(markdown).content))
      else if (markdown !== undefined) replaceRange(markdown, range)(ctx)
      view.focus()
    })
  }

  /** Picker choice: an emoji, a Lucide icon with its color, or nothing to remove the icon. */
  function changeIcon(next?: string, color?: string) {
    setIconState(next)
    setIconColor(next?.startsWith('lucide:') ? color : undefined)
    save.current((f) => setIcon(f, next, next?.startsWith('lucide:') ? color : undefined)).then(onIconChange)
  }

  function toggleInfo() {
    setInfo((open) => {
      localStorage.setItem(INFO_KEY, open ? 'closed' : 'open')
      return !open
    })
  }

  function changeTags(tags: string[]) {
    setProps((p) => ({ ...p, tags }))
    save.current((f) => setTags(f, tags))
  }

  const title = path.slice(path.lastIndexOf('/') + 1, -'.md'.length)
  const placeholderTitle = UNTITLED.test(title) // a page not named yet shows the "Title" placeholder
  const openPicker = (e: React.MouseEvent<HTMLElement>) => setPicker(e.currentTarget.getBoundingClientRect())
  return (
    <div className="mx-auto max-w-3xl px-16 pt-16 pb-32">
      <div className="group/head">
        {icon ? (
          <button
            aria-label="Change icon"
            title="Change icon"
            className="mb-3 grid size-14 place-items-center rounded-md transition-colors duration-150 hover:bg-neutral-100"
            onClick={openPicker}
          >
            <PageIcon icon={icon} color={iconColor} fallback={SmilePlus} size={40} />
          </button>
        ) : (
          <button
            className={`mb-3 inline-flex h-7 items-center gap-1.5 print:hidden rounded-md px-2 text-sm text-neutral-500 transition-[opacity,background-color] duration-150 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:opacity-100 ${empty ? '' : 'opacity-0 group-hover/head:opacity-100'}`}
            onClick={openPicker}
          >
            <SmilePlus size={16} strokeWidth={1.75} /> Add icon
          </button>
        )}
        <h1 className="mb-4 text-[40px] leading-tight font-bold tracking-[-0.02em]">
          <NameInput
            value={placeholderTitle ? '' : title}
            placeholder="Title"
            autoFocus={focusTitle}
            onDone={(name) => name && name !== title && onRename(name)}
            className="w-full rounded-md bg-transparent outline-none placeholder:text-neutral-400"
          />
        </h1>
      </div>
      <div className="mb-6 text-sm">
        <button
          aria-expanded={info}
          className="-ml-1.5 flex h-7 items-center gap-1 rounded-md px-1.5 print:hidden text-neutral-500 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900"
          onClick={toggleInfo}
        >
          <ChevronRight size={14} className={`transition-transform duration-150 ${info ? 'rotate-90' : ''}`} /> Info
        </button>
        {/* Always in the page so it prints; collapsed it is only hidden on screen. */}
        {(
          <div className={`mt-1 space-y-1 rounded-md border border-neutral-200 bg-neutral-50 p-2 ${info ? '' : 'hidden print:block'}`}>
            {props.created && (
              <Row icon={CalendarClock} name="Created">
                {new Date(props.created).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </Row>
            )}
            <Row icon={Tag} name="Tags">
              <div className="flex flex-wrap items-center gap-1">
                {props.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded bg-neutral-100 py-0.5 pr-1 pl-2">
                    {t}
                    <button aria-label={`Remove tag ${t}`} className="rounded text-neutral-400 hover:text-neutral-700" onClick={() => changeTags(props.tags.filter((x) => x !== t))}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  aria-label="Add tag"
                  placeholder="Add tag"
                  className="w-24 bg-transparent py-0.5 outline-none placeholder:text-neutral-400"
                  onKeyDown={(e) => {
                    const input = e.currentTarget
                    const tag = input.value.replace(/[,[\]"']/g, '').trim()
                    if (e.key === 'Enter' && tag) {
                      if (!props.tags.includes(tag)) changeTags([...props.tags, tag])
                      input.value = ''
                    } else if (e.key === 'Backspace' && !input.value && props.tags.length) changeTags(props.tags.slice(0, -1))
                  }}
                />
              </div>
            </Row>
          </div>
        )}
      </div>
      {picker && <IconPicker anchor={picker} icon={icon} color={iconColor} onChange={changeIcon} onClose={() => setPicker(undefined)} />}
      {!ready && (
        <div aria-label="Loading page" className="space-y-3 pt-1">
          {[92, 100, 84, 0, 96, 70].map((w, i) =>
            w ? <div key={i} className={`${skeleton} h-4`} style={{ width: `${w}%` }} /> : <div key={i} className="h-3" />,
          )}
        </div>
      )}
      <div
        ref={mount}
        onClick={openLink}
        onKeyDownCapture={(e) => {
          // Ctrl+D duplicates the block at the cursor; only here, so Chrome's bookmark shortcut never fires.
          if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD' && editor.current) {
            e.preventDefault()
            duplicate(editor.current)
          }
        }}
      />
      {empty && ready && (
        <p className="mt-1 text-neutral-500 print:hidden">
          Start:{' '}
          <button className="font-medium text-neutral-700 underline-offset-2 hover:text-neutral-900 hover:underline" onClick={() => editor.current?.editor.action((ctx) => openAi(ctx))}>
            With AI
          </button>{' '}
          ·{' '}
          <button className="font-medium text-neutral-700 underline-offset-2 hover:text-neutral-900 hover:underline" onClick={() => setTemplates(true)}>
            Template
          </button>
        </p>
      )}
      {templates && (
        <TemplatePicker
          vault={vault}
          onClose={() => setTemplates(false)}
          onPick={(body) => {
            setTemplates(false)
            // The body only: the doc keeps its own front matter (and `created`).
            editor.current?.editor.action(replaceAll(splitFrontMatter(fromTemplate(body, 'x', localDate())).body, true))
          }}
        />
      )}
      {blockMenu && (
        <Menu
          label="Block actions"
          anchor={blockMenu.at}
          footer={blockMenu.footer}
          onClose={() => setBlockMenu(undefined)}
          groups={[
            { label: 'Turn into', items: TURN_INTO.map(([kind, label, icon]) => ({ label, icon, onSelect: () => turnInto(editor.current!, kind) })) },
            {
              items: [
                { label: 'Duplicate', icon: Copy, shortcut: 'Ctrl+D', onSelect: () => duplicate(editor.current!) },
                { label: 'Delete', icon: Trash2, shortcut: 'Del', onSelect: () => remove(editor.current!) },
              ],
            },
          ]}
        />
      )}
      {ai && <DocAi at={ai.at} model={model} selection={ai.selection} onAccept={closeAi} onClose={() => closeAi()} openSettings={openSettings} />}
      {broken && <style>{`${broken} { color: var(--color-danger); text-decoration: line-through; } :is(${broken})::after { content: " (broken link)"; font-size: 0.75em; }`}</style>}
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

function Row({ icon: Icon, name, children }: { icon: typeof Tag; name: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-7 items-center gap-2">
      <div className="flex w-32 shrink-0 items-center gap-2 text-neutral-500">
        <Icon size={16} strokeWidth={1.75} />
        {name}
      </div>
      {children}
    </div>
  )
}
