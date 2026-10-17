import { expect, test } from 'vitest'
import { setIcon, splitFrontMatter } from './frontmatter'

test('splitFrontMatter', () => {
  expect(splitFrontMatter('---\nicon: 🐳\ntags: [a]\n---\n# Hi\n')).toEqual({
    front: '---\nicon: 🐳\ntags: [a]\n---\n',
    body: '# Hi\n',
  })
  expect(splitFrontMatter('# Hi\n---\nx\n---\n')).toEqual({ front: '', body: '# Hi\n---\nx\n---\n' })
  expect(splitFrontMatter('')).toEqual({ front: '', body: '' })
})

test('setIcon', () => {
  expect(setIcon('', '🐳')).toBe('---\nicon: 🐳\n---\n')
  expect(setIcon('---\nicon: 🐳\ntags: [a]\n---\n', '🚀')).toBe('---\nicon: 🚀\ntags: [a]\n---\n')
  expect(setIcon('---\ntags: [a]\n---\n', '🚀')).toBe('---\nicon: 🚀\ntags: [a]\n---\n')
})
