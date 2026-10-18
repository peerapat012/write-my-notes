# v3.4-03 — Cell renderers

**Depends on:** 02

## Goal
Typed cells look and behave like AFFiNE's: select pills, checkbox, number, date, link, with the spec sizes.

## Scope
- Select and multi-select: pill radius 4, padding 1×8, 12px; the option menu lists options with a color dot and a "create" row (already there: restyle only).
- Checkbox: 16px box, centered vertically, accent when checked (already there: restyle only).
- Number, Date, Link: align and size to the grid (ticket 02). Number right-aligned, tabular numerals.
- Add the **Progress** column type (lifts the v3.3 non-goal): a 6px bar with a percent label, edited as a number 0–100. Stored as the number text; the `@schema` type is `progress`.
- The title column's cell shows the page icon or the text icon like AFFiNE's first column.

## Out of scope
- Created time, Attachment, Member, Relation, Rollup.

## Tests
- Parse and serialize a `progress` column: round trip, clamp 0–100, non-number text kept as written.

## Acceptance
- A table with one column of each type looks like the AFFiNE reference in light and dark.
- Edit a progress cell: the `.md` holds the number, reopens the same.
