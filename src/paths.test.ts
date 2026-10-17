import { expect, test } from 'vitest'
import { relativePath, resolvePath } from './paths'

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
