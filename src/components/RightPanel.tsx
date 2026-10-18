import { PanelRightClose } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { iconButton } from './ui'

type Tab = { id: string; label: string; content: ReactNode }

/** Right-hand side panel with a tab strip; ticket 04 adds the History tab to `tabs`. */
export default function RightPanel({ tabs, onClose }: { tabs: Tab[]; onClose: () => void }) {
  const [active, setActive] = useState(tabs[0].id)
  const tab = tabs.find((t) => t.id === active) ?? tabs[0]
  return (
    <aside aria-label="Side panel" className="print:hidden flex w-[260px] shrink-0 flex-col border-l border-neutral-200 bg-neutral-50">
      <header className="flex h-12 shrink-0 items-center gap-0.5 pr-2 pl-3">
        <div role="tablist" className="mr-auto flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === tab.id}
              onClick={() => setActive(t.id)}
              className={`h-7 rounded-md px-2 text-sm font-medium transition-colors duration-150 ${t.id === tab.id ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button className={iconButton} title="Hide panel" aria-label="Hide panel" onClick={onClose}>
          <PanelRightClose size={16} />
        </button>
      </header>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-auto px-2 pb-3">
        {tab.content}
      </div>
    </aside>
  )
}
