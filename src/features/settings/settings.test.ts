import { expect, test } from 'vitest'
import { DEFAULT_MODEL, loadSettings, saveSettings } from './settings'

const store = (value: string | null) => ({ getItem: () => value })

test('defaults when nothing is saved', () => {
  expect(loadSettings(store(null))).toEqual({ theme: 'system', model: DEFAULT_MODEL })
})

test('defaults for corrupt or invalid values', () => {
  expect(loadSettings(store('{oops'))).toEqual({ theme: 'system', model: DEFAULT_MODEL })
  expect(loadSettings(store('{"theme":"blue","model":"  "}'))).toEqual({ theme: 'system', model: DEFAULT_MODEL })
})

test('round-trips saved settings', () => {
  let saved: string | null = null
  saveSettings({ theme: 'dark', model: 'gemini-x' }, { setItem: (_, v) => void (saved = v) })
  expect(loadSettings(store(saved))).toEqual({ theme: 'dark', model: 'gemini-x' })
})
