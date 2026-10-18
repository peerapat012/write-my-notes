import { expect, test } from 'vitest'
import { parseTasks, serializeTasks, statusOf } from './tasks'

const text = ['| Task | Status | Tags |', '|---|---|---|', '| Create Adventure MainScreen | In progress | ui |', '| Create World Map Screen | Not started | ui, map |'].join('\n')

test('parse the table into tasks', () => {
  expect(parseTasks(text)).toEqual([
    { name: 'Create Adventure MainScreen', status: 'In progress', tags: ['ui'] },
    { name: 'Create World Map Screen', status: 'Not started', tags: ['ui', 'map'] },
  ])
})

test('round trip keeps the canonical text', () => {
  expect(serializeTasks(parseTasks(text))).toBe(text)
  expect(serializeTasks([])).toBe('| Task | Status | Tags |\n|---|---|---|')
})

test('unknown status shows as Not started but stays as written', () => {
  const [task] = parseTasks('| Task | Status | Tags |\n|---|---|---|\n| a | Blocked | x |')
  expect(task.status).toBe('Blocked')
  expect(statusOf(task.status)).toBe('Not started')
  expect(serializeTasks([task])).toContain('| a | Blocked | x |')
  expect(statusOf('Done')).toBe('Done')
})

test('a pipe in a cell is written \\| and read back', () => {
  const tasks = [{ name: 'a | b', status: 'Done', tags: ['x|y'] }]
  const out = serializeTasks(tasks)
  expect(out).toContain('| a \\| b | Done | x\\|y |')
  expect(parseTasks(out)).toEqual(tasks)
})

test('tags with spaces, empty tags, and a table without the outer pipes missing cells', () => {
  expect(parseTasks('| Task | Status | Tags |\n|---|---|---|\n| a | Done | big idea, other |\n| b | |')).toEqual([
    { name: 'a', status: 'Done', tags: ['big idea', 'other'] },
    { name: 'b', status: '', tags: [] },
  ])
  expect(serializeTasks([{ name: 'a', status: 'Done', tags: [] }])).toContain('| a | Done |  |')
})
