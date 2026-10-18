import { getCurrentWindow } from '@tauri-apps/api/window'
import { Copy, Minus, Square, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const control = 'grid h-full w-[46px] place-items-center text-neutral-700 transition-colors duration-150 hover:bg-neutral-200 hover:text-neutral-900'

/** Desktop window bar, in the app's own colours: drag area with the page name, and the three window controls. */
export default function TitleBar({ title }: { title: string }) {
  const win = getCurrentWindow()
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    const sync = () => win.isMaximized().then(setMaximized)
    sync()
    const unlisten = win.onResized(sync)
    return () => void unlisten.then((f) => f())
  }, [win])

  return (
    <header className="flex h-8 shrink-0 print:hidden select-none items-center border-b border-neutral-200 bg-neutral-50">
      {/* The drag region must be the element under the pointer, so the text inside it ignores the mouse. */}
      <div data-tauri-drag-region className="flex h-full min-w-0 flex-1 items-center pl-3">
        <span className="pointer-events-none truncate text-xs text-neutral-600">{title}</span>
      </div>
      <button className={control} title="Minimize" aria-label="Minimize" onClick={() => win.minimize()}>
        <Minus size={14} strokeWidth={1.5} />
      </button>
      <button className={control} title={maximized ? 'Restore' : 'Maximize'} aria-label={maximized ? 'Restore' : 'Maximize'} onClick={() => win.toggleMaximize()}>
        {maximized ? <Copy size={12} strokeWidth={1.5} /> : <Square size={12} strokeWidth={1.5} />}
      </button>
      <button className={`${control} hover:bg-red-600 hover:text-white`} title="Close" aria-label="Close" onClick={() => win.close()}>
        <X size={14} strokeWidth={1.5} />
      </button>
    </header>
  )
}
