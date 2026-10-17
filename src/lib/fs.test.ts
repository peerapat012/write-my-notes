import { expect, test } from 'vitest'
import { diskAction } from './fs'

test('external change: ignore same file, reload clean, ask dirty', () => {
  expect(diskAction(100, 100, false)).toBe('ignore')
  expect(diskAction(100, 100, true)).toBe('ignore') // own unsaved edits, disk untouched
  expect(diskAction(100, 200, false)).toBe('reload')
  expect(diskAction(100, 200, true)).toBe('ask')
})
