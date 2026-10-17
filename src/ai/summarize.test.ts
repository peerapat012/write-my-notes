import { expect, test } from 'vitest'
import { boardTexts, summaryDoc } from './summarize'

test('boardTexts keeps live non-empty text only', () => {
  expect(
    boardTexts([
      { type: 'text', text: ' idea ' },
      { type: 'text', text: '   ' },
      { type: 'text', text: 'gone', isDeleted: true },
      { type: 'rectangle' },
    ]),
  ).toEqual(['idea'])
})

test('summaryDoc starts with a link back to the board', () => {
  expect(summaryDoc('My Flow.excalidraw', '## Notes\n- a\n')).toBe('[My Flow](My%20Flow.excalidraw)\n\n## Notes\n- a\n')
})
