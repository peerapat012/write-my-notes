/** Class strings shared by every surface, so buttons, panels and fields look the same everywhere. */

/** Floating surface: menus, toolbars, dialogs. */
export const panel = 'rounded-lg border border-neutral-200 bg-white text-neutral-900 shadow-panel'

export const iconButton =
  'grid size-7 shrink-0 place-items-center rounded-md text-neutral-500 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40'

const button =
  'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40'
export const primaryButton = `${button} bg-accent text-on-accent hover:bg-accent/90`
export const secondaryButton = `${button} border border-neutral-200 text-neutral-900 hover:bg-neutral-100`
export const dangerButton = `${button} bg-red-600 text-white hover:bg-red-700`
export const ghostButton = `${button} text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900`

export const input =
  'h-8 w-full rounded-md border border-neutral-300 bg-white px-2.5 text-sm text-neutral-900 transition-colors duration-150 placeholder:text-neutral-500 hover:border-neutral-400 focus-visible:outline-offset-0'

/** Keyboard shortcut hint, right-aligned in menus. */
export const shortcut = 'ml-auto shrink-0 pl-3 font-sans text-xs text-neutral-500'
export const skeleton = 'animate-pulse rounded bg-neutral-100'
