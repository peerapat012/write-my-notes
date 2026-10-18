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
import { versionDate } from './versionDate'

export type Viewing = { page: string; hash: string; date: string; content: string }

type Props = { vault: Vault; dark: boolean; view: Viewing; onRestore: () => void; onBack: () => void }

/** An old version of the page shown read-only, under a bar to restore it or go back. */
export default function VersionView({ vault, dark, view, onRestore, onBack }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div role="status" className="flex h-11 shrink-0 items-center gap-2 border-b border-neutral-200 bg-accent-soft pr-14 pl-4 text-accent">
        <span className="mr-auto truncate">Viewing version from {versionDate(view.date)}</span>
        <button className={primaryButton} onClick={onRestore}>
          Restore
        </button>
        <button className={ghostButton} onClick={onBack}>
          Back to current
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
function DocVersion({ vault, path, text }: { vault: Vault; path: string; text: string }) {
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
    crepe.setReadonly(true)
    crepe.create()
    return () => void crepe.destroy()
  }, [vault, path, text])
  return <div className="mx-auto max-w-3xl px-16 pt-10 pb-32" ref={mount} />
}

/** Excalidraw in view mode. */
function BoardVersion({ vault, path, text, dark }: { vault: Vault; path: string; text: string; dark: boolean }) {
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
