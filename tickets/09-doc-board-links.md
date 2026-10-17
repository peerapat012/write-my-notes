# 09 — Doc ↔ board links

**Depends on:** 04, 06, 08

## Goal
Connect docs and boards in both directions.

## Scope
- **Doc card on a board:**
  - Drag a doc from the sidebar onto the board to create a card: a rect showing the title and the first ~3 lines.
  - The card stores `customData.docPath`, a path relative to the board.
  - Double-clicking the card opens the doc.
  - The card text refreshes when the board opens.
- **Board embed in a doc:**
  - `![](Flow.excalidraw)` renders as a preview made with `exportToSvg`.
  - Clicking the preview opens the board.
- Both show a broken state when the target is missing.

## Acceptance
- Card and embed both survive a reload and a rename (ticket 08).
