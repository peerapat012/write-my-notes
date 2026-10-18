import { expect, test } from 'vitest'
import { calloutMarker, DEFAULT_EMOJI, parseCallout } from './callout'

test('callout marker: round trip, plain quote stays a quote, missing emoji falls back', () => {
  expect(calloutMarker('🔥')).toBe('🔥 [!callout]')
  expect(parseCallout(calloutMarker('🔥'))).toBe('🔥')
  expect(parseCallout('⚠️ [!callout]')).toBe('⚠️')
  expect(parseCallout('[!callout]')).toBe(DEFAULT_EMOJI)
  expect(calloutMarker()).toBe(`${DEFAULT_EMOJI} [!callout]`)
  expect(parseCallout('Just a quote')).toBeUndefined()
  expect(parseCallout('')).toBeUndefined()
  expect(parseCallout('Note: [!callout]')).toBeUndefined()
  expect(parseCallout('[!callout] extra')).toBeUndefined()
  expect(parseCallout('[!NOTE]')).toBeUndefined()
})
