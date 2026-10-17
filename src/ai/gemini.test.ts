import { expect, test } from 'vitest'
import { resolveKey } from './gemini'

test('settings key wins; env key only in dev', () => {
  expect(resolveKey('mine', true, 'env')).toBe('mine')
  expect(resolveKey('mine', false, 'env')).toBe('mine')
  expect(resolveKey('', true, 'env')).toBe('env')
  expect(resolveKey('', false, 'env')).toBe('')
  expect(resolveKey('', true)).toBe('')
})
