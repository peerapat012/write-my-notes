import { ArrowDownUp, Copy, FileText, FolderOpen, Heading1, List, Pencil, Plus, Presentation, Quote, Search, Trash2, Type } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import Menu, { MenuRow } from '@/components/Menu'
import { ghostButton, iconButton, input, panel, primaryButton, secondaryButton, skeleton } from '@/components/ui'

/** Dev-only (`/dev/ui`): the shared components in light and dark side by side, for screenshots and contrast checks. */
export default function DevUi() {
  return (
    <div className="grid min-h-screen grid-cols-2 text-sm">
      <Sheet />
      <div className="dark">
        <Sheet />
      </div>
    </div>
  )
}

const noop = () => {}

function Sheet() {
  return (
    <div className="h-full space-y-8 bg-white p-8 text-neutral-900">
      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <button className={primaryButton}>Primary</button>
          <button className={secondaryButton}>Secondary</button>
          <button className={ghostButton}>Ghost</button>
          <button className={iconButton} aria-label="Search">
            <Search size={16} />
          </button>
          <button className={primaryButton} disabled>
            Disabled
          </button>
        </div>
      </Section>
      <Section title="Inputs">
        <div className="grid max-w-xs gap-2">
          <input className={input} defaultValue="gemini-3.6-flash" aria-label="Filled" />
          <input className={input} placeholder="Placeholder text" aria-label="Empty" />
        </div>
      </Section>
      <Section title="Menus">
        <div className="flex flex-wrap items-start gap-4">
          <Menu
            label="Block actions"
            groups={[
              {
                label: 'Turn into',
                items: [
                  { label: 'Text', icon: Type, onSelect: noop },
                  { label: 'Heading 1', icon: Heading1, shortcut: 'Ctrl+Alt+1', onSelect: noop },
                  { label: 'Bulleted list', icon: List, onSelect: noop },
                  { label: 'Quote', icon: Quote, onSelect: noop },
                ],
              },
              {
                label: 'Actions',
                items: [
                  { label: 'Duplicate', icon: Copy, shortcut: 'Ctrl+D', onSelect: noop },
                  { label: 'Move', icon: ArrowDownUp, onSelect: noop },
                  { label: 'Delete', icon: Trash2, shortcut: 'Del', onSelect: noop },
                ],
              },
            ]}
          />
          <Menu
            label="Page actions"
            groups={[
              { items: [{ label: 'Rename', icon: Pencil, onSelect: noop }] },
              { items: [{ label: 'New doc', icon: FileText, onSelect: noop }, { label: 'New board', icon: Presentation, onSelect: noop }] },
            ]}
          />
        </div>
      </Section>
      <Section title="Palette row">
        <div className={`${panel} max-w-md p-1`}>
          <MenuRow active icon={FileText} label="Project A" hint={<span className="ml-auto pl-3 text-xs text-neutral-500">Project A.md</span>} detail="…the deploy script reads the config from…" />
          <MenuRow active={false} icon={Presentation} label="Flow" hint={<span className="ml-auto pl-3 text-xs text-neutral-500">Project A/Flow.excalidraw</span>} />
        </div>
      </Section>
      <Section title="Dialog">
        <div className={`${panel} max-w-sm p-5`}>
          <h2 className="font-semibold">“Project A” changed on disk</h2>
          <p className="mt-1.5 text-neutral-500">You have unsaved edits. Keep yours and overwrite the file, or load the version on disk?</p>
          <div className="mt-5 flex justify-end gap-2">
            <button className={secondaryButton}>Load disk version</button>
            <button className={primaryButton}>Keep mine</button>
          </div>
        </div>
      </Section>
      <Section title="Sidebar rows">
        <div className="w-[260px] rounded-md bg-neutral-50 p-2">
          <div className="flex h-7 items-center gap-2 rounded-md px-2 text-neutral-700">
            <FileText size={16} className="text-neutral-500" /> Inbox
          </div>
          <div className="flex h-7 items-center gap-2 rounded-md bg-neutral-100 px-2 text-neutral-700">
            <FileText size={16} className="text-neutral-500" /> Hovered page
            <Plus size={15} className="ml-auto text-neutral-500" />
          </div>
          <div className="flex h-7 items-center gap-2 rounded-md bg-accent-soft px-2 font-medium">
            <FileText size={16} className="text-neutral-500" /> Active page
          </div>
          <div className="px-2 pt-2 text-xs font-medium text-neutral-500">sample-notes</div>
        </div>
      </Section>
      <Section title="Empty and loading states">
        <div className="grid gap-4">
          <div className="h-64 rounded-md border border-neutral-200">
            <EmptyState icon={FolderOpen} title="Open your notes folder" actions={<button className={primaryButton}>Open folder</button>}>
              Notedflow keeps each page as a plain Markdown or Excalidraw file in a folder you choose.
            </EmptyState>
          </div>
          <div className="space-y-2.5 rounded-md border border-neutral-200 p-4">
            {[70, 55, 80].map((w) => (
              <div key={w} className={`${skeleton} h-3.5`} style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-medium text-neutral-500">{title}</h2>
      {children}
    </section>
  )
}
