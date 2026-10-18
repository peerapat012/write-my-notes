# v3-08 — All pages

**Depends on:** 02

## Goal
See every page in one list, sorted by what changed last.

## Scope
- An **All pages** item in the sidebar opens a list in the main area. Web and desktop.
- Columns:
  - Title, with a one-line preview: about the first 100 characters of a doc body, or board text from the v2-06 extraction
  - Tags (docs)
  - Created: doc `created`, "—" for boards
  - Updated: `Vault.stat` `lastModified`
  - a star column, left empty for ticket 09
- Groups by Updated: Today, Yesterday, This week, Older.
- Tabs: All, Doc, Board.
- Click the Title, Created or Updated header to sort. Default: Updated, newest first.
- Click a row to open the page.
- Pages in `.trash/` and `.templates/` are not listed.
- Reuse the search index for text where it already has it.
- New UI: design it with `/impeccable` and `/ui-ux-pro-max`.

## Out of scope
- Filter button, collections, Recent list.

## Tests
- Grouping by Updated across day boundaries. Sorting by each column. Board created shows "—".

## Acceptance
- A page edited now shows under Today, at the top.
- The Board tab shows only boards. Sort by Title works both ways.
- A trashed page is not listed.
