# v3-12 — Daily note

**Depends on:** 11

## Goal
One click to today's note.

## Scope
- A **Today** button in the sidebar opens `Daily/YYYY-MM-DD.md` for the local date.
- If it does not exist, create it (and `Daily/`) from the Journal template.
- Web and desktop.

## Out of scope
- Calendar view. Links to the previous and next day.

## Tests
- Local date to file name around midnight (use the local date, not UTC).

## Acceptance
- Click Today twice: one file, opened both times.
- The next day, Today creates a new file.
- `Daily/` shows as a plain folder in the tree.
