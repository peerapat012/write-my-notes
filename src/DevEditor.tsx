import { Crepe, CrepeFeature } from '@milkdown/crepe'
import { editorViewCtx } from '@milkdown/kit/core'
import { insertSourceBlock } from '@/features/doc/insertSourceBlock'
import { NEW_TABLE } from '@/features/doc/datatable'
import { useEffect, useRef } from 'react'
import { calloutItem, calloutView } from '@/features/doc/calloutView'
import { datatableView } from '@/features/doc/datatableView'
import { tasksView } from '@/features/doc/tasksView'

const SAMPLE = `# Heading 1

## Heading 2

### Heading 3

Body text at 15px. A paragraph with a [link](https://example.com) and \`code\`.

> 💡 [!callout]
>
> Callout body text.

> A plain quote.

| Name | Role |
|---|---|
| Ann | Dev |
| Bo | PM |

\`\`\`ts
const x = 1
\`\`\`

\`\`\`tasks
| Task | Status | Tags |
|---|---|---|
| Write spec | Done | docs |
| Build table | In progress | ui, table |
\`\`\`

\`\`\`datatable
@schema {"title":"Untitled","types":["text","text","text"]}
| Title | Column | Column 2 |
|---|---|---|
|  |  |  |
\`\`\`
`

/** Dev-only (`/dev/ui`): the doc editor without a vault, to check the block chrome (headings, slash menu, handle, callout, code block). */
export default function DevEditor() {
  const mount = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const crepe = new Crepe({ root: mount.current, defaultValue: SAMPLE, featureConfigs: { [CrepeFeature.BlockEdit]: { buildMenu: (b) => b.getGroup('advanced').addItem('callout', calloutItem) } } })
    crepe.editor.use(tasksView).use(datatableView('Dev.md')).use(calloutView(() => {}))
    crepe.create().then(() => {
      ;((window as unknown as { crepes: Crepe[] }).crepes ??= []).push(crepe)
      ;(window as unknown as { pmView: () => unknown }).pmView = () => crepe.editor.action((ctx) => ctx.get(editorViewCtx))
      // The slash menu's Data table item, to check what inserting one looks like (same steps as DocPage).
      ;(window as unknown as { insertDt: () => void }).insertDt = () => crepe.editor.action((ctx) => insertSourceBlock(ctx, 'datatable', NEW_TABLE))
    }) // for checking the saved Markdown from the console
    return () => void crepe.destroy()
  }, [])
  return (
    <main className="relative pl-14">
      <div ref={mount} />
    </main>
  )
}
