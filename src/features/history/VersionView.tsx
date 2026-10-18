import { Crepe, CrepeFeature } from '@milkdown/crepe'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types'
import { syntaxHighlighting } from '@codemirror/language'
import { classHighlighter } from '@lezer/highlight'
import { useEffect, useRef, useState } from 'react'
import { ghostButton, primaryButton } from '@/components/ui'
import { readBoard } from '@/features/board/readBoard'
import { splitFrontMatter } from '@/features/doc/frontmatter'
import type { Vault } from '@/lib/fs'
import { resolvePath } from '@/lib/paths'
import { openPage, pageAt, pageTarget } from '@/lib/pages'
import { datatableView } from '@/features/doc/datatableView'
import { cardView } from '@/features/doc/linkView'
import { versionDate } from './versionDate'

export type Viewing = { page: string; hash: string; date: string; content: string }

type Props = {
  vault: Vault
  dark: boolean
  view: Viewing
  onRestore?: () => void // no Restore button without it
  onBack: () => void
  label?: string
  backLabel?: string
}

/** An old version of the page shown read-only, under a bar to restore it or go back. */
export default function VersionView({ vault, dark, view, onRestore, onBack, label, backLabel = 'Back to current' }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div role="status" className="flex h-11 shrink-0 items-center gap-2 border-b border-neutral-200 bg-accent-soft pr-14 pl-4 text-accent">
        <span className="mr-auto truncate">{label ?? `Viewing version from ${versionDate(view.date)}`}</span>
        {onRestore && (
          <button className={primaryButton} onClick={onRestore}>
            Restore
          </button>
        )}
        <button className={ghostButton} onClick={onBack}>
          {backLabel}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {view.page.endsWith('.md') ? (
          <DocVersion key={view.hash} vault={vault} path={view.page} text={view.content} />
        ) : (
          <BoardVersion key={view.hash} vault={vault} path={view.page} text={view.content} dark={dark} />
        )}
      </div>
    </div>
  )
}

/** The doc editor, read-only. Images come from the current `assets/`. */
export function DocVersion({ vault, path, text, className = 'mx-auto max-w-3xl px-16 pt-10 pb-32' }: { vault: Vault; path: string; text: string; className?: string }) {
  const mount = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const crepe = new Crepe({
      root: mount.current,
      defaultValue: splitFrontMatter(text).body,
      featureConfigs: {
        [CrepeFeature.CodeMirror]: { theme: syntaxHighlighting(classHighlighter) },
        [CrepeFeature.ImageBlock]: {
          proxyDomURL: async (url: string) => (/^[a-z]+:/i.test(url) ? url : vault.readBlob(resolvePath(path, url)).then(URL.createObjectURL, () => url)),
        },
      },
    })
    crepe.editor.use(datatableView(path)).use(cardView(path))
    crepe.setReadonly(true)
    crepe.create()
    return () => void crepe.destroy()
  }, [vault, path, text])
  // A page link opens the peek view (Ctrl/Cmd+click: full screen).
  function onClick(e: React.MouseEvent) {
    const href = (e.target as HTMLElement).closest('a')?.getAttribute('href')
    const target = href ? pageTarget(path, href) : undefined
    if (target && pageAt(target)) {
      e.preventDefault()
      openPage(target, e)
    }
  }
  return <div className={className} ref={mount} onClick={onClick} />
}

/** Excalidraw in view mode. */
export function BoardVersion({ vault, path, text, dark }: { vault: Vault; path: string; text: string; dark: boolean }) {
  const [data, setData] = useState<ExcalidrawInitialDataState>()
  const [error, setError] = useState('')
  useEffect(() => {
    readBoard(vault, path, text).then(
      ({ data }) => setData({ ...data, appState: { ...data.appState, viewBackgroundColor: 'transparent' } }),
      (e) => setError(String(e)),
    )
  }, [vault, path, text])
  if (error)
    return (
      <p role="alert" className="p-4 text-danger">
        Could not open this version: {error}
      </p>
    )
  return (
    <div className="h-full">
      {data && (
        <Excalidraw
          initialData={data}
          viewModeEnabled
          theme={dark ? 'dark' : 'light'}
          UIOptions={{ canvasActions: { changeViewBackgroundColor: false, clearCanvas: false, export: false, loadScene: false, saveToActiveFile: false, toggleTheme: false, saveAsImage: false } }}
        />
      )}
    </div>
  )
}
