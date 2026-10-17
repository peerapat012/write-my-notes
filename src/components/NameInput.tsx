export const INVALID = /^\.|[\\/:*?"<>|]/ // hidden (dot) names and characters Windows can't store

type Props = { value: string; onDone: (name: string) => void; className?: string; autoFocus?: boolean }

/** Page-name input: Enter or blur reports the trimmed name (`value` if invalid), Esc reports `value`. */
export default function NameInput({ value, onDone, className, autoFocus }: Props) {
  return (
    <input
      aria-label="Page name"
      className={className}
      defaultValue={value}
      autoFocus={autoFocus}
      onFocus={(e) => autoFocus && e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') e.currentTarget.value = value
        if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
      }}
      onBlur={(e) => {
        const name = e.currentTarget.value.trim()
        const ok = name && !INVALID.test(name)
        if (!ok) e.currentTarget.value = value
        onDone(ok ? name : value)
      }}
    />
  )
}
