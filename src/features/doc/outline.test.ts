import { expect, test } from 'vitest'
import { headings } from './outline'

test('headings lists levels and text, skipping fenced code and front matter', () => {
  const md = '---\ntitle: x\n# not a heading\n---\n# One\ntext\n## **Two** `code`\n```sh\n# comment\n```\n~~~\n## also code\n~~~\n###### Six ##\n#nospace\n    # indented code\n'
  expect(headings(md)).toEqual([
    { level: 1, text: 'One' },
    { level: 2, text: 'Two code' },
    { level: 6, text: 'Six' },
  ])
})
