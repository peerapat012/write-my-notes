import { expect, test } from 'vitest'
import { BUILT_IN, fromTemplate, toTemplate } from './templates'

test('new doc from a template: created replaced, other front matter kept', () => {
  const out = fromTemplate('---\ncreated: 2020-01-01T00:00\ntags: [a]\n---\n# Hi\n', '2026-10-18T09:00', '2026-10-18')
  expect(out).toBe('---\ncreated: 2026-10-18T09:00\ntags: [a]\n---\n# Hi\n')
})

test('a template without front matter gets a created block', () => {
  expect(fromTemplate('# Hi\n', '2026-10-18T09:00', '2026-10-18')).toBe('---\ncreated: 2026-10-18T09:00\n---\n# Hi\n')
  expect(fromTemplate('---\ntags: [a]\n---\nx', '2026-10-18T09:00', '2026-10-18')).toBe('---\ncreated: 2026-10-18T09:00\ntags: [a]\n---\nx')
})

test('{{date}} is filled in', () => {
  expect(fromTemplate('# {{date}}\n\n{{date}}', 'c', '2026-10-18')).toBe('---\ncreated: c\n---\n# 2026-10-18\n\n2026-10-18')
})

test('saving as a template drops created and keeps the rest', () => {
  expect(toTemplate('---\ncreated: 1\ntags: [a]\n---\nbody')).toBe('---\ntags: [a]\n---\nbody')
  expect(toTemplate('---\ncreated: 1\n---\nbody')).toBe('body')
  expect(toTemplate('body')).toBe('body')
})

test('built-in templates: Meeting notes has headings, Task list has a task block', () => {
  const by = (name: string) => BUILT_IN.find((t) => t.name === name)!.body
  expect(by('Meeting notes')).toContain('## Agenda')
  expect(by('Task list')).toContain('```tasks')
  expect(BUILT_IN.map((t) => t.name)).toEqual(['Meeting notes', 'Journal', 'Task list'])
})
