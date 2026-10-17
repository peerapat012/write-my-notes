import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = { icon: LucideIcon; title: string; children: ReactNode; actions?: ReactNode }

/** Centered placeholder for a screen with nothing to show yet: what is missing, and how to fix it. */
export default function EmptyState({ icon: Icon, title, children, actions }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 pb-[10vh] text-center">
      <Icon size={28} strokeWidth={1.5} className="text-neutral-400" />
      <h2 className="mt-4 text-base font-semibold text-balance">{title}</h2>
      <div className="mt-1 max-w-sm text-sm text-pretty text-neutral-500">{children}</div>
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  )
}
