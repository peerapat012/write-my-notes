import { expect, test } from 'vitest'
import { DEFAULT_MODEL, loadSettings, saveSettings } from './settings'

const store = (value: string | null) => ({ getItem: () => value })
const defaults = { theme: 'system', model: DEFAULT_MODEL, key: '', mode: 'simple' }

test('defaults when nothing is saved', () => {
  expect(loadSettings(store(null))).toEqual(defaults)
})

test('defaults for corrupt or invalid values', () => {
  expect(loadSettings(store('{oops'))).toEqual(defaults)
  expect(loadSettings(store('{"theme":"blue","model":"  ","key":5}'))).toEqual(defaults)
})

test('round-trips saved settings', () => {
  let saved: string | null = null
  saveSettings({ theme: 'dark', model: 'gemini-x', key: 'abc', mode: 'advanced' }, { setItem: (_, v) => void (saved = v) })
  expect(loadSettings(store(saved))).toEqual({ theme: 'dark', model: 'gemini-x', key: 'abc', mode: 'advanced' })
})
