# v3.4-06 — Views bar: Kanban and Calendar

**Depends on:** 02, 03

## Goal
The Data table header has view tabs, Table, Kanban and Calendar, like AFFiNE.

## Scope
This lifts the v3.3 non-goal. Ship Table plus Kanban first; Calendar is a second commit in the same ticket only if Kanban lands cleanly.
- View tabs in the table header (replaces the single "Table View" tab).
- **Kanban:** columns are the options of one select column (the "group by" column, chosen in the view menu). Cards show the title and up to 3 other cells. Drag a card to another column to change its value. Stored in `@schema` as `views` (an array of `{type, groupBy}`). Missing `views` means one Table view.
- **Calendar:** month grid over one date column; click a day to add a record with that date.
- Files with no `views` open and save unchanged.

## Out of scope
- Filters, sort per view, view reorder, Gallery.

## Tests
- Parse and serialize `views`: round trip, missing, unknown type ignored, `groupBy` pointing at a removed column falls back to Table.
- Group rows by a select column: a pure function with tests.

## Acceptance
- Add a Kanban view, group by Status, drag a card: the cell value changes in the table and in the `.md`.
- Delete the group-by column: the Kanban view falls back to Table, nothing crashes.
- Light and dark.
