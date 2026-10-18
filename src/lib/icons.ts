/** Colors of a Lucide page icon, stored by name (`iconColor: blue`). index.css maps each to light and dark values (`--icon-<name>`). */
export const ICON_COLORS = ['gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'] as const
export type IconColor = (typeof ICON_COLORS)[number]

/** CSS color for a stored name; an unknown or missing name is the default gray. */
export const iconColorVar = (name?: string) => `var(--icon-${ICON_COLORS.includes(name as IconColor) ? name : 'gray'})`

export const LUCIDE_PREFIX = 'lucide:'
