# 19 — Page properties (created, tags)

**Depends on:** 10, 16

## Goal
Docs show a Notion-style property list under the title: Created and Tags.

## Scope
- Properties live in the doc's front matter, next to `icon`:
  ```
  ---
  icon: 🐳
  created: 2026-10-17T23:47
  tags: [journal, idea]
  ---
  ```
  - Write `tags` in flow style (`[a, b]`). Read both flow style and block lists (`- a`).
  - Keep every other front matter key and its formatting intact, as `setIcon` does.
- `created` is written when the app creates a new doc. It is read-only in the UI.
  - Docs without `created` hide the row. Never backfill it: that would touch every file in git.
- Tags can be added and removed under the title. Removing the last tag removes the `tags` key.
- Layout follows Notion: each row has a Lucide icon and a muted name on the left, and the value on the right.
- Ctrl+K search (ticket 10) matches `#tag` against page tags.
- Docs only. Boards have no properties in v1.

## Out of scope
- "Add a property" (user-defined properties and types).
- A tag index page or a sidebar tag filter.

## Tests
- Front matter: read `created` and `tags` (both list styles), and set or remove tags without touching other keys.
- Search: `#tag` queries match pages by tag.

## Acceptance
- Create a doc: its front matter has `created`, and the Created row shows it.
- Add and remove tags: the file changes only in the `tags` line.
- An existing doc without `created` shows no Created row, and opening it does not change the file.
- Ctrl+K `#journal` finds the docs tagged `journal`.
