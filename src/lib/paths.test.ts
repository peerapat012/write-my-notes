import { expect, test } from 'vitest'
import { relativePath, resolvePath, untitledName } from './paths'

test('relativePath', () => {
  expect(relativePath('A.md', 'assets/img-1.png')).toBe('assets/img-1.png')
  expect(relativePath('A/B.md', 'assets/img-1.png')).toBe('../assets/img-1.png')
  expect(relativePath('A/B/C.md', 'assets/img-1.png')).toBe('../../assets/img-1.png')
  expect(relativePath('assets/x.md', 'assets/img-1.png')).toBe('img-1.png')
})

test('resolvePath', () => {
  expect(resolvePath('A.md', 'assets/img-1.png')).toBe('assets/img-1.png')
  expect(resolvePath('A/B/C.md', '../../assets/img-1.png')).toBe('assets/img-1.png')
  expect(resolvePath('A/B.md', './My%20pic.png')).toBe('A/My pic.png')
})

test('untitledName skips names taken by pages or folders', () => {
  expect(untitledName(new Set(), '', '.md')).toBe('Untitled')
  expect(untitledName(new Set(['Untitled.md', 'Untitled 2.md']), '', '.md')).toBe('Untitled 3')
  expect(untitledName(new Set(['Untitled.md']), '', '.excalidraw')).toBe('Untitled') // another type
  expect(untitledName(new Set(['A/Untitled.md', 'A/Untitled 2']), 'A', '.md')).toBe('Untitled 3')
})
