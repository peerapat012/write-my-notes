# v3-15 — Doc card on boards

**Depends on:** 02

## Goal
A board can show docs on the canvas.

## Scope
- A doc card is an Excalidraw `embeddable` element. Its `link` holds the doc path relative to the board file.
  - Render it with `renderEmbeddable`. Allow the link with `validateEmbeddable`. Both exist in Excalidraw 0.18.
  - It shows the doc content read-only. The implementer picks the renderer. Prefer the doc editor in read-only mode, for the same look.
- Add a card from a "Doc" tool in the board toolbar (opens a page picker), or by dragging a doc from the sidebar onto the board.
- Cards move, resize and delete like other elements. Double-click opens the doc.
- The card updates when the doc is saved in the app, and on the focus check.
- The v1 ticket 08 rename/move rewrite also rewrites doc card links.
- A missing target (deleted, in Trash, renamed outside the app) shows the v1 broken-link state.
- PNG/SVG export (v1 ticket 15): a card exports as a box with the doc title.
- Doc card text is not added to the board text index.
- New UI: design it with `/impeccable` and `/ui-ux-pro-max`.

## Out of scope
- Editing the doc inside the card. AI (ticket 16).

## Tests
- Doc card link rewrite on rename and move of the doc and of the board.

## Acceptance
- Drag a doc onto a board: a card shows its content. Edit the doc: the card updates.
- Rename the doc in the app: the card still works, and the `.excalidraw` holds the new path.
- Move the doc to Trash: the card shows a broken link. Restore it: the card works again.
- Export PNG: the card is a titled box.
