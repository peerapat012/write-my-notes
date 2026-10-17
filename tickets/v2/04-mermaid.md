# v2-04 — Mermaid in docs

**Depends on:** —

## Goal
Fenced `mermaid` code blocks in docs render as diagrams.

## Scope
- A fenced code block with language `mermaid` shows the diagram when it is not focused, and shows the code when clicked for editing.
  - First check the `renderPreview` option of Crepe's CodeMirror feature. Build a custom node view only if it cannot do this.
- The `.md` file keeps a plain fenced block.
- Lazy-load `mermaid` the first time a doc has a mermaid block. It must not be in the main chunk.
- The diagram theme follows the app's light/dark theme, and diagrams re-render on theme change.
- A syntax error shows the error message in the block instead of a diagram.
- Add a "Mermaid" slash menu item that inserts an empty mermaid block, unless Crepe's code block menu already makes this one step.

## Out of scope
- Mermaid on boards.
- Exporting diagrams as images.

## Acceptance
- A doc with a flowchart and a sequence diagram renders both. Editing the code updates the diagram.
- Bad syntax shows an error, and the rest of the doc still works.
- Switching the theme re-renders the diagrams.
- The saved `.md` diff shows only the fenced block.
- After `npm run build`, `mermaid` is in a separate chunk.
