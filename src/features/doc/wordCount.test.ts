import { expect, test } from 'vitest'
import { countWords } from './wordCount'

test('countWords ignores front matter and markdown syntax', () => {
  const md = '---\nicon: 🐳\ntags: [a, b]\n---\n# Hello world\n\n- [ ] **bold** item\n1. see [the docs](x.md)\n\n> quote\n\n![](assets/img-1.png)\n\n```ts\nconst a\n```\n\n---\n'
  expect(countWords(md).words).toBe(10) // Hello world bold item see the docs quote const a
  expect(countWords('# Hi')).toEqual({ words: 1, characters: 2 })
  expect(countWords('')).toEqual({ words: 0, characters: 0 })
})

test('countWords splits Thai without spaces', () => {
  expect(countWords('สวัสดีครับ').words).toBeGreaterThan(1)
})
