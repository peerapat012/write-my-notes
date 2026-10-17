import { expect, test } from 'vitest'
import { getProps, setIcon, setTags, splitFrontMatter } from './frontmatter'

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

test('getProps reads created and both tag styles', () => {
  expect(getProps('---\ncreated: 2026-10-17T23:47\ntags: [journal, "idea"]\n---\n')).toEqual({ created: '2026-10-17T23:47', tags: ['journal', 'idea'] })
  expect(getProps('---\nicon: 🐳\ntags:\n  - a\n  - b\nx: 1\n---\n')).toEqual({ created: undefined, tags: ['a', 'b'] })
  expect(getProps('')).toEqual({ created: undefined, tags: [] })
})

test('setTags touches only the tags entry', () => {
  expect(setTags('', ['a'])).toBe('---\ntags: [a]\n---\n')
  expect(setTags('---\nicon: 🐳\n---\n', ['a', 'b'])).toBe('---\nicon: 🐳\ntags: [a, b]\n---\n')
  expect(setTags('---\nicon: 🐳\ntags: [a]\nx: 1\n---\n', ['a', 'b'])).toBe('---\nicon: 🐳\ntags: [a, b]\nx: 1\n---\n')
  expect(setTags('---\ntags:\n  - a\n  - b\nx: 1\n---\n', ['a'])).toBe('---\ntags: [a]\nx: 1\n---\n')
  expect(setTags('---\nicon: 🐳\ntags: [a]\n---\n', [])).toBe('---\nicon: 🐳\n---\n')
})
