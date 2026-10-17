# 17 — Delete page

**Depends on:** 08, 16

## Goal
The user can delete a page or a plain folder from the sidebar.

## Scope
- Add Delete to the sidebar `⋯` menu (from ticket 16), for pages and plain folders.
- Show a confirmation dialog before deleting. It names the page and says how many child pages will be deleted with it.
- On confirm, delete the page file and its same-name child folder (or the plain folder) permanently. There is no in-app trash. Git is the undo.
- Links that pointed at a deleted page show the "broken link" state from ticket 08. Do not rewrite them.
- If the deleted page is open, go to its parent page. With no parent page, show the "no page selected" empty state.
- Remove deleted pages from the search index (ticket 10) and from the `dirty` set. Your own deletes must not trigger the external-change prompt (ticket 07).

## Tests
- Pure function that lists what a delete removes (page file, child folder, child pages count) from a tree.

## Acceptance
- Delete a page with children: the file and the child folder are gone from disk, and the tree updates.
- Cancel the dialog: nothing changes on disk.
- Delete the open page: the app moves to the parent page.
- A doc that linked to the deleted page shows a broken link.
