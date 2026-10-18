import { useMemo } from 'react'
import DocPage from '@/features/doc/DocPage'
import type { Vault } from '@/lib/fs'

const noop = () => {}

/** Dev-only (`/dev/ui`): the page head (title, icon, Info) over an in-memory page; only the Vault calls the doc page makes at load and save. */
export default function DevDoc({ dark }: { dark: boolean }) {
  const vault = useMemo(() => {
    const doc = { text: '---\ncreated: 2026-10-01T09:00:00.000Z\ntags: [spec]\n---\nA short page.\n\n```tasks\n| Task | Status | Tags |\n|---|---|---|\n| Write spec | Done | docs |\n```\n\n```datatable\n@schema {"title":"Untitled","types":["text","select","text"]}\n| Title | Column | Column 2 |\n|---|---|---|\n| a | x |  |\n```\n' }
    return { name: 'dev', id: 'dev', stat: async () => Date.now(), read: async () => doc.text, write: async (_: string, t: string) => void (doc.text = t) } as unknown as Vault
  }, [])
  return (
    <main className="relative -mx-8">
      <DocPage vault={vault} dark={dark} path="Dev page.md" exists={new Set()} go={noop} onRename={noop} onIconChange={noop} onSave={noop} onHeadings={noop} model="" openSettings={noop} focusTitle={false} linkedFrom={[]} />
    </main>
  )
}
