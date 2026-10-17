# v2-01 — Vault storage seam

**Depends on:** —

## Goal
Put all file access behind one `Vault` interface that takes relative paths, so a Tauri implementation can drop in later. Behavior does not change.

## Scope
- Turn `src/lib/fs.ts` into a `Vault` interface plus an `fsAccess` implementation built on the current `FileSystemDirectoryHandle` code.
  - The operations cover what the app does today: list entries, read text/blob, write, create page, move, delete, save asset, and `stat` (`lastModified`).
  - Paths are strings relative to the notes folder. The implementer picks the exact method names.
- Components and features get a `Vault` (prop or context). No `FileSystem*Handle` type appears outside `src/lib/`.
  - Today about 14 places in `.tsx` files touch handles directly, in `App.tsx`, `Sidebar.tsx`, `DocPage.tsx`, `BoardPage.tsx` and `readBoard.ts`. Move all of them.
- Keep the IndexedDB root-handle storage and the permission re-prompt inside `fsAccess`.
- Keep the dirty/flush tracking (`dirty`, `flushes`) working as before.

## Out of scope
- `tauriFs` (ticket 07).
- Any change to the storage model on disk.

## Tests
- Path handling: relative path to segments, nested folders, `assets/`, leading and trailing slashes.
- The existing `fs.test.ts` still passes. Adapt it to the new shape if needed.

## Acceptance
- `npm test`, `npm run build` and `npm run lint` are clean.
- `grep -r "FileSystem.*Handle" src --include=*.tsx` finds nothing.
- In the browser: open a folder; create, rename, move and delete pages; edit a doc and a board; paste an image; trigger an external change on focus. Everything works as before.
