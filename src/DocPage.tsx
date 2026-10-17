import { Crepe, CrepeFeature } from '@milkdown/crepe'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'
import { remarkStringifyOptionsCtx } from '@milkdown/kit/core'
import { SmilePlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ConflictDialog from './ConflictDialog'
import { diskAction, dirty, getFile, saveAsset, writeFile } from './fs'
import { setIcon, splitFrontMatter } from './frontmatter'
import { relativePath, resolvePath } from './paths'
import { parseIcon } from './tree'

type Props = { root: FileSystemDirectoryHandle; path: string; onIconChange: () => void }

export default function DocPage({ root, path, onIconChange }: Props) {
  const mount = useRef<HTMLDivElement>(null)
  const save = useRef<(icon?: string) => Promise<void>>(async () => {})
  const [icon, setIconState] = useState<string>()
  const [rev, setRev] = useState(0) // bumped to reload the file from disk
  const [conflict, setConflict] = useState<(loadDisk: boolean) => void>()

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
                : URL.createObjectURL(await (await getFile(root, resolvePath(path, url))).getFile()),
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

    addEventListener('focus', onFocus)
    return () => {
      removeEventListener('focus', onFocus)
      cancelled = true
      if (timer) save.current() // flush pending edits when leaving the page
      crepe?.destroy()
    }
  }, [root, path, rev])

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
      <h1 className="mb-4 text-4xl font-bold">{title}</h1>
      <div ref={mount} />
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
