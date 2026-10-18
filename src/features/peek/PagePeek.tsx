import { ArrowUpRight, CalendarClock, Clock, Info, Link, Tag } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import Peek from '@/components/Peek'
import { getProps, splitFrontMatter } from '@/features/doc/frontmatter'
import { BoardVersion } from '@/features/history/VersionView'
import type { Vault } from '@/lib/fs'
import { usePage } from '@/lib/pages'
import { toast, toastError } from '@/lib/toast'

type Props = {
  vault: Vault
  path: string
  dark: boolean
  /** The doc page (DocPage with App's props); boards open in view mode here. */
  doc: ReactNode
  onOpen: () => void
  onClose: () => void
}

const when = (ms?: number | string) => (ms ? new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—')

/** A page opened in the peek modal: the doc fully editable, a board in view mode. */
export default function PagePeek({ vault, path, dark, doc, onOpen, onClose }: Props) {
  const page = usePage(path)
  const [info, setInfo] = useState(false)
  const { created, tags } = getProps(splitFrontMatter(page?.text ?? '').front)
  return (
    <Peek
      label={`Peek: ${page?.title ?? path}`}
      onClose={onClose}
      buttons={[
        { label: 'Open page', icon: ArrowUpRight, onClick: onOpen },
        {
          label: 'Copy link',
          icon: Link,
          onClick: () =>
            navigator.clipboard.writeText(`[${page?.title ?? path}](${encodeURI(path)})`).then(
              () => toast('Link copied', 'success'),
              () => toastError('Could not copy the link'),
            ),
        },
        { label: 'Info', icon: Info, pressed: info, onClick: () => setInfo((o) => !o) },
      ]}
      aside={
        info && (
          <div className="absolute top-12 right-3 z-10 w-64 space-y-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm shadow-panel transition-[opacity,translate] duration-200 ease-out sm:top-3 starting:-translate-y-1 starting:opacity-0">
            <Row icon={CalendarClock} name="Created">
              {when(created)}
            </Row>
            <Row icon={Clock} name="Updated">
              {when(page?.mtime)}
            </Row>
            <Row icon={Tag} name="Tags">
              {tags.length ? tags.join(', ') : '—'}
            </Row>
          </div>
        )
      }
    >
      {path.endsWith('.md') ? doc : <BoardPeek vault={vault} path={path} dark={dark} />}
    </Peek>
  )
}

function Row({ icon: Icon, name, children }: { icon: typeof Tag; name: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex w-24 shrink-0 items-center gap-1.5 text-neutral-500">
        <Icon size={14} /> {name}
      </span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  )
}

function BoardPeek({ vault, path, dark }: { vault: Vault; path: string; dark: boolean }) {
  const [text, setText] = useState<string>()
  useEffect(() => {
    vault.read(path).then(setText, (e) => toastError(`Could not open the board: ${e}`))
  }, [vault, path])
  return <div className="h-full">{text !== undefined && <BoardVersion vault={vault} path={path} text={text} dark={dark} />}</div>
}
