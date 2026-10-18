# v3.4-02 — Data table grid

**Depends on:** —

## Goal
The Data table reads like AFFiNE's Table view: a frameless grid (lines inside only) with fixed row and header heights.

## Scope
Use the values in the spec table. Files: `src/features/doc/TableBlock.tsx`, `src/index.css`.
- Grid: every cell has a right and a bottom line, the header also a top line. No outer border, no radius, no shaded header (corrected in v3.4: AFFiNE has no frame). Row min height 34, header 34. Empty rows keep their height.
- Columns: default width 180, min 100. **Column resize by dragging the header edge** (lifts the v3.3 non-goal). The width is saved in the `@schema` JSON as an optional `w` per column. Missing `w` means 180. Files with no `w` still open the same.
- Header cell: type icon, name, sort arrow; padding 6, 14px, secondary text, hover fill; click opens the existing column menu.
- Left rail 24px: drag grip and row select appear on row hover (the existing row menu stays).
- Bottom: "+ New Record" row, then a stats bar (34) with the existing summary actions.
- Add-column button min width 40.
- Horizontal scrollbar 8px, thumb only on hover.

## Out of scope
- New column types (ticket 03). Views (ticket 06).

## Tests
- Parse and serialize the `@schema` JSON with and without `w`: round trip, missing `w`, invalid `w` ignored.

## Acceptance
- A new empty table looks like the AFFiNE reference: grid, 34px rows, visible header surface.
- Drag a column edge: width changes, persists after save and reopen, never below 100.
- Open a v3.3 file (no `w`): same look as a new table, file text unchanged until edited.
- Light and dark.
