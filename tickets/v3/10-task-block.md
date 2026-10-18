# v3-10 — Task block

**Depends on:** —

## Goal
Track tasks with a status inside a doc, like a simple Notion database.

## Scope
- `/` → **Tasks** inserts a task block.
- In the `.md` it is a fenced block with language `tasks`, holding a GFM table with the columns Task, Status, Tags (format in the spec).
  - Status: `Not started`, `In progress`, `Done`. Unknown values show as Not started and stay as written until the row is edited.
  - Tags: comma-separated. A `|` in a cell is `\|`.
- In the app it renders as an editable table:
  - Status pills: gray, blue, green. Tag pills.
  - Add a row, delete a row, edit a name, change a status, edit tags. The implementer picks the UI.
  - Every edit rewrites the fenced block text only.
- Check Crepe's CodeMirror `renderPreview` (used for Mermaid) first. Use a custom node view only if it cannot be made editable.
- Check that the existing GFM table is in the `/` menu. If it is not, enable it.
- New UI: design it with `/impeccable` and `/ui-ux-pro-max`.

## Out of scope
- Custom statuses or columns. Rows as pages. Sorting or filtering tasks.

## Tests
- Parse and serialize the `tasks` table: round trip, unknown status, `\|` escapes, tags with spaces.

## Acceptance
- Insert a task block, add 3 rows, set statuses: the `.md` holds the fenced table and reopens the same.
- Edit the `.md` outside the app: the block shows the change after the focus check.
- Ctrl+K finds a task name.
- `/` → Table inserts a GFM table.
- Looks right in light and dark themes.
