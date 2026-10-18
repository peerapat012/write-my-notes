# v3-02 — Trash

**Depends on:** —

## Goal
A deleted page can be brought back.

## Scope
- Delete page (v1 ticket 17) moves the page to `.trash/`, keeping its path: `A/B.md` becomes `.trash/A/B.md`. Its child folder moves with it.
- `.trash/` stays out of the sidebar tree, Ctrl+K, and every other list. `Vault.list` already skips names that start with `.`. The Trash view needs a way to list `.trash/`. The implementer picks how.
- Links to a trashed page render as broken links, as in v1.
- A **Trash** item in the sidebar opens a Trash view:
  - the trashed pages (the top level of each trashed tree) with their original path
  - **Restore**: moves the page and its child folder back. If the path is taken, add " (restored)" to the name.
  - **Empty trash**: a confirm dialog, then deletes everything in `.trash/`
- No auto-delete.
- The delete dialog says "Move to Trash", not "permanently".
- Web and desktop.
- New UI: design it with `/impeccable` and `/ui-ux-pro-max`.

## Out of scope
- Deleting single items forever. Trash for assets.

## Tests
- Original path to trash path and back, nested pages, child folders.
- " (restored)" name when the original path is taken.

## Acceptance
- Delete a page with children: it leaves the tree and shows in Trash. Restore: it and its children come back at the same place, and links to it work again.
- Delete `A.md`, create a new `A.md`, then restore: you get `A (restored).md`.
- Empty trash asks first, then `.trash/` is gone.
- Ctrl+K does not find text from trashed pages.
