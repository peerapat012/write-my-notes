import { Crepe } from '@milkdown/crepe'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'
import { remarkStringifyOptionsCtx } from '@milkdown/kit/core'
import { useEffect, useRef, useState } from 'react'
import { dirty, getFile, writeFile } from './fs'
import { setIcon, splitFrontMatter } from './frontmatter'
import { parseIcon } from './tree'

type Props = { root: FileSystemDirectoryHandle; path: string; onIconChange: () => void }

export default function DocPage({ root, path, onIconChange }: Props) {
  const mount = useRef<HTMLDivElement>(null)
  const save = useRef<(icon?: string) => Promise<void>>(async () => {})
  const [icon, setIconState] = useState<string>()

  useEffect(() => {
    let crepe: Crepe | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    getFile(root, path).then(async (file) => {
      const text = await (await file.getFile()).text()
      if (cancelled) return
      let { front, body } = splitFrontMatter(text)
      setIconState(parseIcon(path, text))

      crepe = new Crepe({ root: mount.current, defaultValue: body })
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

      let writing = Promise.resolve()
      save.current = (newIcon) => {
        clearTimeout(timer)
        timer = undefined
        if (newIcon) front = setIcon(front, newIcon)
        const content = front + crepe!.getMarkdown()
        writing = writing.then(() => writeFile(file, content)).then(() => {
          if (!timer) dirty.delete(path)
        })
        return writing
      }
    })

    return () => {
      cancelled = true
      if (timer) save.current() // flush pending edits when leaving the page
      crepe?.destroy()
    }
  }, [root, path])

  function changeIcon(value: string) {
    const next = [...new Intl.Segmenter().segment(value.trim())].at(-1)?.segment
    if (!next) return
    setIconState(next)
    save.current(next).then(onIconChange)
  }

  const title = path.slice(path.lastIndexOf('/') + 1, -'.md'.length)
  return (
    <div className="mx-auto max-w-3xl px-16 py-10">
      <input
        aria-label="Page icon (Win + . for emoji)"
        title="Type or paste an emoji (Win + .)"
        className="mb-2 w-14 rounded bg-transparent text-4xl hover:bg-neutral-100"
        value={icon ?? ''}
        placeholder="📄"
        onChange={(e) => changeIcon(e.target.value)}
      />
      <h1 className="mb-4 text-4xl font-bold">{title}</h1>
      <div ref={mount} />
    </div>
  )
}
