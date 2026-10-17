import { Crepe, CrepeFeature } from '@milkdown/crepe'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'
import { exportToSvg } from '@excalidraw/excalidraw'
import { remarkStringifyOptionsCtx } from '@milkdown/kit/core'
import { SmilePlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ConflictDialog from './ConflictDialog'
import { diskAction, dirty, flushes, getFile, saveAsset, writeFile } from './fs'
import { setIcon, splitFrontMatter } from './frontmatter'
import { linkTarget } from './links'
import NameInput from './NameInput'
import { relativePath, resolvePath } from './paths'
import { readBoard } from './readBoard'
import { parseIcon } from './tree'

/** Shown in place of a board embed whose `.excalidraw` file is missing. */
const brokenBoard = (name: string) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="64"><rect x="1" y="1" width="478" height="62" rx="6" fill="#fef2f2" stroke="#dc2626" stroke-dasharray="6 4"/><text x="240" y="37" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#dc2626">Broken link: board “${name.replace(/[<>&]/g, '')}” not found</text></svg>`,
  )

/** Blob URL of an SVG preview of board `path`; `previews` maps it back to the board for click-to-open. */
async function boardPreview(root: FileSystemDirectoryHandle, path: string, previews: Map<string, string>) {
  try {
    const { data } = await readBoard(root, path, await (await (await getFile(root, path)).getFile()).text())
    const svg = await exportToSvg({ elements: data.elements, appState: { ...data.appState, exportBackground: true, viewBackgroundColor: '#ffffff' }, files: data.files })
    const url = URL.createObjectURL(new Blob([svg.outerHTML], { type: 'image/svg+xml' }))
    previews.set(url, path)
    return url
  } catch {
    return brokenBoard(path.slice(path.lastIndexOf('/') + 1))
  }
}

type Props = {
  root: FileSystemDirectoryHandle
  path: string
  exists: Set<string> // every path in the notes folder, for broken-link marks
  go: (path: string) => void
  onRename: (name: string) => void
  onIconChange: () => void
}

export default function DocPage({ root, path, exists, go, onRename, onIconChange }: Props) {
  const mount = useRef<HTMLDivElement>(null)
  const save = useRef<(icon?: string) => Promise<void>>(async () => {})
  const [icon, setIconState] = useState<string>()
  const [rev, setRev] = useState(0) // bumped to reload the file from disk
  const [conflict, setConflict] = useState<(loadDisk: boolean) => void>()
  const [broken, setBroken] = useState('') // CSS selector list of links whose target is missing
  const previews = useRef(new Map<string, string>()) // board preview blob URL -> board path

  useEffect(() => {
    let crepe: Crepe | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false
    let file: FileSystemFileHandle | undefined
    let known = 0 // lastModified as of our last read or write
    let writing = Promise.resolve()
    let checking = false

    async function onFocus() {
      if (!file || checking) return
      checking = true
      await writing
      const action = diskAction(known, (await file.getFile()).lastModified, dirty.has(path))
      if (action !== 'ignore') {
        clearTimeout(timer) // no autosave over the disk version while we decide
        timer = undefined
        if (action === 'ask' && !(await new Promise<boolean>((r) => setConflict(() => r)))) save.current()
        else {
          dirty.delete(path)
          setRev((r) => r + 1)
        }
      }
      checking = false
    }

    getFile(root, path).then(async (handle) => {
      const disk = await handle.getFile()
      const text = await disk.text()
      if (cancelled) return
      known = disk.lastModified
      let { front, body } = splitFrontMatter(text)
      setIconState(parseIcon(path, text))

      crepe = new Crepe({
        root: mount.current,
        defaultValue: body,
        featureConfigs: {
          [CrepeFeature.ImageBlock]: {
            onUpload: async (image) => relativePath(path, await saveAsset(root, image)),
            // ponytail: blob URLs are never revoked; fine per page view, revoke on unmount if memory grows.
            proxyDomURL: async (url) =>
              /^[a-z]+:/i.test(url)
                ? url
                : resolvePath(path, url).endsWith('.excalidraw')
                  ? boardPreview(root, resolvePath(path, url), previews.current)
                  : getFile(root, resolvePath(path, url)).then((h) => h.getFile()).then(URL.createObjectURL, () => url),
          },
        },
      })
      // Match common hand-written markdown so saves don't churn git diffs.
      crepe.editor.config((ctx) => ctx.update(remarkStringifyOptionsCtx, (o) => ({ ...o, bullet: '-' as const, rule: '-' as const })))
      crepe.on((l) =>
        l.markdownUpdated(() => {
          dirty.add(path)
          clearTimeout(timer)
          timer = setTimeout(() => save.current(), 500)
        }),
      )
      await crepe.create()
      file = handle

      save.current = (newIcon) => {
        clearTimeout(timer)
        timer = undefined
        if (newIcon) front = setIcon(front, newIcon)
        // Image blocks store their resize ratio as alt text; drop the default so plain `![](...)` stays plain.
        const content = front + crepe!.getMarkdown().replace(/!\[1\.00\]\(/g, '![](')
        writing = writing
          .then(() => writeFile(handle, content))
          .then(async () => {
            known = (await handle.getFile()).lastModified
            if (!timer) dirty.delete(path)
          })
        return writing
      }
    })

    const flush = () => (timer ? save.current() : writing)
    flushes.add(flush)
    addEventListener('focus', onFocus)
    return () => {
      flushes.delete(flush)
      removeEventListener('focus', onFocus)
      cancelled = true
      if (timer) save.current() // flush pending edits when leaving the page
      crepe?.destroy()
    }
  }, [root, path, rev])

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
    const board = previews.current.get((e.target as HTMLElement).closest('img')?.src ?? '')
    if (board) return go(board)
    const href = (e.target as HTMLElement).closest('a')?.getAttribute('href')
    const target = href ? linkTarget(path, href) : undefined
    if (target && exists.has(target)) {
      e.preventDefault()
      go(target)
    }
  }

  function changeIcon(value: string) {
    const next = [...new Intl.Segmenter().segment(value.trim())].at(-1)?.segment
    if (!next) return
    setIconState(next)
    save.current(next).then(onIconChange)
  }

  const title = path.slice(path.lastIndexOf('/') + 1, -'.md'.length)
  return (
    <div className="mx-auto max-w-3xl px-16 py-10">
      <div className="relative mb-2 w-14">
        <input
          aria-label="Page icon (Win + . for emoji)"
          title="Type or paste an emoji (Win + .)"
          className="w-full rounded bg-transparent text-4xl hover:bg-neutral-100"
          value={icon ?? ''}
          onChange={(e) => changeIcon(e.target.value)}
        />
        {!icon && <SmilePlus className="pointer-events-none absolute inset-0 m-auto text-neutral-400" size={28} />}
      </div>
      <h1 className="mb-4 text-4xl font-bold">
        <NameInput value={title} onDone={(name) => name !== title && onRename(name)} className="w-full rounded bg-transparent outline-none" />
      </h1>
      <div ref={mount} onClick={openLink} />
      {broken && <style>{`${broken} { color: var(--color-red-600); text-decoration: line-through; } :is(${broken})::after { content: " (broken link)"; font-size: 0.75em; }`}</style>}
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
