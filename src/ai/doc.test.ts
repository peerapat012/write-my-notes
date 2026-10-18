import { expect, test } from 'vitest'
import { docPrompt } from './doc'

test('selection: instruction plus the selected markdown', () => {
  const p = docPrompt('translate to Thai', 'Hello **world**')
  expect(p).toContain('Instruction: translate to Thai')
  expect(p).toContain('Markdown:\nHello **world**')
  expect(p).toContain('replaces it')
})

test('no selection: prompt only', () => {
  for (const p of [docPrompt('a checklist for a release'), docPrompt('a checklist for a release', '  ')]) {
    expect(p).toContain('Request: a checklist for a release')
    expect(p).not.toContain('Markdown:\n')
  }
})
