# v3-04 — Page history

**Depends on:** 01, 03

## Goal
See older versions of a page and bring one back.

## Scope
- A **History** tab in the right panel (ticket 01). Desktop only, for docs and boards.
  - Versions newest first: date, time, message. Source: `git log --follow -- <path>`.
  - 50 per load, then "Load more".
- Clicking a version shows it read-only in the page area, with a bar: "Viewing version from <date>", **Restore**, **Back to current**.
  - Content comes from `git show <hash>:<path>`, using the path the file had at that commit (it can differ after a rename).
  - Doc: the doc editor in read-only mode. Board: Excalidraw in view mode.
  - Images load from the current `assets/`.
- **Restore** writes the old content with `Vault.write`, then reloads the page. That is a normal edit: autosave runs and the changed-file count goes up. No `checkout`, `reset` or `revert`.
- Not a repo, or git missing: the tab shows a placeholder where the "Set up history" button goes (ticket 06).
- Web build: no History tab.
- New UI: design it with `/impeccable` and `/ui-ux-pro-max`.

## Out of scope
- Diff view. Commit graph (ticket 05). Wizard (ticket 06).

## Tests
- Parse the `log` output into versions, with the path at each commit across a rename.

## Acceptance
- Save 3 versions of a doc: History lists 3. Open the oldest: it renders read-only. Restore: the doc shows the old text and the footer count is 1.
- Rename the page, save a version: History still shows the versions from before the rename, and they open.
- A board version opens in view mode and cannot be edited.
- The web build has no History tab.
