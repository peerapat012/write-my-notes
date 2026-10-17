# 08 — Rename/move + link rewrite

**Depends on:** 02

## Goal
Renaming or moving a page never breaks links created inside the app.

## Scope
- Rename a page from the page title or the sidebar. Move a page by dragging it in the sidebar.
- Move the page file and its same-name child folder together. The File System Access API has no rename, so copy and then delete.
- Pure function `rewriteLinks(files, oldPath, newPath)`, which updates:
  - markdown links and images in `.md` files
  - doc-card paths in `.excalidraw` files (format defined in ticket 09; until then, handle `customData.docPath`)
- Write a pure detector for broken links: references whose target does not exist.

## Tests
- `rewriteLinks`: same folder, across folders, a moved parent changing child-relative paths, untouched unrelated links.
- Broken-link detection.

## Acceptance
- Rename a doc that is linked from another doc: the link still works.
- After renaming a file outside the app, the link is flagged as broken.
