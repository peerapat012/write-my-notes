# v3-14 — Backlinks

**Depends on:** —

## Goal
See which pages link to the page you are reading.

## Scope
- A collapsible **Linked from** section under the doc body.
  - Lists the pages (docs and boards) that link to or embed this page, with their icon and title.
  - Clicking one opens it.
  - Hidden when nothing links here.
- Reuse the reference finder from the v1 ticket 08 rename/move rewrite. Pages in `.trash/` and `.templates/` do not count.
- Updates on save and on the focus check.
- Docs only. Boards do not show the section.
- Web and desktop.
- New UI: design it with `/impeccable` and `/ui-ux-pro-max`.

## Out of scope
- The text around each link. Unlinked mentions. A graph view.

## Tests
- Backlinks for a page: doc links, board embeds and links, relative paths from nested folders, trashed pages excluded.

## Acceptance
- Link doc B from doc A: B shows "Linked from: A". Remove the link: the section hides.
- A board that embeds B shows in B's list.
- Move A to Trash: it leaves B's list.
