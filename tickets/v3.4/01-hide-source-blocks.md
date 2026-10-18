# v3.4-01 — Hide source blocks

**Depends on:** —

## Goal
A ```` ```datatable ````, ```` ```tasks ```` or card-link source never shows its raw text. Only the widget shows.

## Scope
- Reproduce first: open a page with a Data table on `main`. The request screenshot shows the code block (language label, line numbers, raw `@schema {...}` and pipe rows) and a paragraph of raw `@schema ...` text under the table. Record what you see, and whether it still happens.
- If it does not happen on `main`, say so in the commit message and add a regression test or check (below) so it cannot come back. Stop there.
- If it does happen, find the cause (suspects: Crepe's CodeMirror node view not taking the `tasks-source` node decoration; the paragraph coming from a second parse of the same text) and fix it at the shared place, not once per block (`src/features/doc/datatableView.ts`, `tasksView.ts`, `linkView.ts`, `src/index.css`).
- The source stays in the document and in the saved file.

## Out of scope
- Any visual change to the table (ticket 02).

## Tests
- A unit test for any pure helper you add. If the fix is only CSS or a decoration, the acceptance below is the test.

## Acceptance
- A page with a Data table, a Tasks block and a card link shows no raw `@schema`, no pipe rows, no code block label for them.
- Save and reopen: the `.md` still holds the fenced block unchanged.
- Light and dark.
