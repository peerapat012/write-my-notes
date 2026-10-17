const escape = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)

let lib: Promise<typeof import('mermaid').default> | undefined
let n = 0

/** Svg (or an error message) for mermaid `code`. Loads mermaid on first use, so it stays out of the main chunk. */
export async function renderMermaid(code: string, dark: boolean) {
  lib ??= import('mermaid').then((m) => m.default)
  const mermaid = await lib
  mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default', securityLevel: 'strict', suppressErrorRendering: true })
  try {
    return (await mermaid.render(`mermaid-${n++}`, code)).svg
  } catch (e) {
    return `<pre class="mermaid-error">${escape(e instanceof Error ? e.message : String(e))}</pre>`
  }
}

/**
 * Crepe `renderPreview` for code blocks: mermaid blocks get a diagram, other languages none (`null`).
 * Empty code also gets none, so a fresh block just shows the editor.
 */
export function mermaidPreview(dark: boolean) {
  return (language: string, content: string, apply: (value: string | null) => void) => {
    if (language !== 'mermaid' || !content.trim()) return null
    renderMermaid(content, dark).then(apply)
  }
}
