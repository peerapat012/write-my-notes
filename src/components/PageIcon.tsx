import type { LucideIcon } from 'lucide-react'
import { DynamicIcon } from 'lucide-react/dynamic'
import { iconColorVar, LUCIDE_PREFIX } from '@/lib/icons'

type Props = {
  /** An emoji, or `lucide:<name>`. */
  icon?: string
  color?: string
  /** Shown when the page has no icon. */
  fallback: LucideIcon
  size?: number
  className?: string
}

/** A page icon of either kind: system emoji, or a Lucide icon in its palette color. Lucide icons load lazily, one small chunk each. */
export default function PageIcon({ icon, color, fallback: Fallback, size = 16, className = 'text-neutral-500' }: Props) {
  if (icon?.startsWith(LUCIDE_PREFIX))
    return (
      <DynamicIcon
        name={icon.slice(LUCIDE_PREFIX.length) as never}
        size={size}
        strokeWidth={1.75}
        style={{ color: iconColorVar(color) }}
        fallback={() => <span style={{ width: size, height: size }} />}
      />
    )
  if (icon)
    return (
      <span aria-hidden className="leading-none" style={{ fontSize: size }}>
        {icon}
      </span>
    )
  return <Fallback size={size} className={className} />
}
