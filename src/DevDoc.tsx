import { useMemo } from 'react'
import DocPage from '@/features/doc/DocPage'
import type { Vault } from '@/lib/fs'

const noop = () => {}

/** Dev-only (`/dev/ui`): the page head (title, icon, Info) over an in-memory page; only the Vault calls the doc page makes at load and save. */
export default function DevDoc({ dark }: { dark: boolean }) {
  const vault = useMemo(() => {
    let text = '---\ncreated: 2026-10-01T09:00:00.000Z\ntags: [spec]\n---\nA short page.\n'
    return { name: 'dev', id: 'dev', stat: async () => Date.now(), read: async () => text, write: async (_: string, t: string) => void (text = t) } as unknown as Vault
  }, [])
  return (
    <main className="relative -mx-8">
      <DocPage vault={vault} dark={dark} path="Dev page.md" exists={new Set()} go={noop} onRename={noop} onIconChange={noop} onSave={noop} onHeadings={noop} model="" openSettings={noop} focusTitle={false} linkedFrom={[]} />
    </main>
  )
}
