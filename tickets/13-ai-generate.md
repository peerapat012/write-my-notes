# 13 — AI: generate sticky / flow / outline

**Depends on:** 12

## Goal
Generate new board content from a prompt.

## Scope
- The panel's "Create new" section has an items slider (N) and three modes:
  - **Sticky notes:** schema `{notes: string[]}`. Place N stickies in a grid.
  - **Flow diagram:** schema `{nodes: [{id, label}], edges: [{from, to, label?}]}`. Lay out top to bottom, with arrows bound to nodes.
  - **Outline:** schema `{title, items: string[]}`. Place a title text and a bullet text block.
- Pure mappers turn the JSON into skeletons for `convertToExcalidrawElements`. Content is placed at the viewport centre, and the new elements are selected.

## Tests
- Each mapper: element count, bindings for the flow, no overlap in the grid.

## Acceptance
- Each mode produces readable, non-overlapping content.
- Undo removes the generated content.
