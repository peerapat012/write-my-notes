import { expect, test } from 'vitest'
import { dailyPath, localDate } from './daily'

test('uses the local date around midnight', () => {
  expect(localDate(new Date(2026, 9, 18, 0, 5))).toBe('2026-10-18') // 00:05 local, whatever UTC says
  expect(localDate(new Date(2026, 9, 18, 23, 59))).toBe('2026-10-18')
  expect(localDate(new Date(2026, 0, 3, 12))).toBe('2026-01-03')
  expect(dailyPath(new Date(2026, 11, 31, 23, 59))).toBe('Daily/2026-12-31.md')
})
