import { splitFrontMatter } from './frontmatter'

/** Plain text of a markdown doc: no front matter, block markers, inline marks, image or link targets. */
export function plainText(markdown: string) {
  return splitFrontMatter(markdown)
    .body.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links keep their text
    .replace(/^\s*```.*$/gm, ' ') // code fences
    .replace(/^\s*(-{3,}|\*{3,}|\|[-:| ]+\|)\s*$/gm, ' ') // rules, table separators
    .replace(/^\s*(#{1,6}|>|[-*+](\s+\[[ xX]\])?|\d+[.)])\s+/gm, '') // heading, quote, list and to-do markers
    .replace(/<br\s*\/?>|[*_~`|]+/g, ' ') // breaks, inline marks, table pipes
}

/** Word and character counts. Words use the locale-aware segmenter, so Thai (no spaces) counts right. */
export function countWords(markdown: string) {
  const text = plainText(markdown).replace(/\s+/g, ' ').trim()
  const words = [...new Intl.Segmenter(undefined, { granularity: 'word' }).segment(text)].filter((s) => s.isWordLike).length
  return { words, characters: [...new Intl.Segmenter().segment(text)].length }
}
