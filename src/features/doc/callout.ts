// A callout is a blockquote whose first paragraph is `<emoji> [!callout]`. Other editors show it as a quote.

export const DEFAULT_EMOJI = '💡'
const EMOJI = /^\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*$/u

/** The marker paragraph for a callout with `emoji` (a missing one falls back to the default). */
export const calloutMarker = (emoji?: string) => `${emoji || DEFAULT_EMOJI} [!callout]`

/** The callout's emoji if `first` (a quote's first paragraph) is a callout marker, else undefined. */
export function parseCallout(first: string): string | undefined {
  const m = first.trim().match(/^(.*?)\s*\[!callout\]$/)
  if (!m) return undefined
  if (!m[1]) return DEFAULT_EMOJI
  return EMOJI.test(m[1]) ? m[1] : undefined
}
