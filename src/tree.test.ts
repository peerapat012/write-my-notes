import { expect, test } from 'vitest'
import { buildTree, parseIcon, type Entry } from './tree'

const f = (path: string, icon?: string): Entry => ({ path, kind: 'file', icon })
const d = (path: string): Entry => ({ path, kind: 'dir' })

test('nested pages, plain folders, hidden assets', () => {
  const tree = buildTree([
    f('Project A.md', '🐳'),
    d('Project A'),
    f('Project A/Sub page.md'),
    f('Project A/Flow.excalidraw'),
    d('Misc'),
    f('Misc/Note.md'),
    d('assets'),
    f('assets/img-1.png'),
    f('readme.txt'),
  ])
  expect(tree).toEqual([
    {
      name: 'Misc',
      path: 'Misc',
      type: 'folder',
      children: [{ name: 'Note', path: 'Misc/Note.md', type: 'doc', icon: undefined, children: [] }],
    },
    {
      name: 'Project A',
      path: 'Project A.md',
      type: 'doc',
      icon: '🐳',
      children: [
        { name: 'Flow', path: 'Project A/Flow.excalidraw', type: 'board', icon: undefined, children: [] },
        { name: 'Sub page', path: 'Project A/Sub page.md', type: 'doc', icon: undefined, children: [] },
      ],
    },
  ])
})

test('parseIcon', () => {
  expect(parseIcon('a.md', '---\ntitle: x\nicon: 🐳\n---\n# Hi')).toBe('🐳')
  expect(parseIcon('a.md', '---\r\nicon: "🚀"\r\n---\r\n')).toBe('🚀')
  expect(parseIcon('a.md', '# no front matter\nicon: 🐳')).toBeUndefined()
  expect(parseIcon('b.excalidraw', '{"type":"excalidraw","icon":"🎨"}')).toBe('🎨')
  expect(parseIcon('b.excalidraw', '{"type":"excalidraw"}')).toBeUndefined()
  expect(parseIcon('b.excalidraw', 'not json')).toBeUndefined()
})
