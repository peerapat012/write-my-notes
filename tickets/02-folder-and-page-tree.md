# 02 — Open folder + page tree

**Depends on:** 01

## Goal
The user picks a notes folder and sees its page tree in the sidebar.

## Scope
- Add an "Open folder" button that calls `showDirectoryPicker()`.
- Store the handle in IndexedDB. On reload, call `requestPermission()` again and reopen the folder.
- Write a pure function `buildTree(entries)` that turns a file list into tree nodes (see SPEC "Storage model"):
  - `.md` file: doc page
  - `.excalidraw` file: board page
  - same-name folder: that page's children
  - folder with no matching page: plain folder
  - `assets/`: hidden
- Read page icons from `.md` front matter (`icon:`) and the `.excalidraw` top-level `"icon"` field.
- Sidebar: tree with collapse and expand, plus `+` to create a new doc or board.
- An empty board file is a minimal valid Excalidraw JSON.
- Routing: selecting a page opens `/page/<relative path>`. The main area can show a placeholder for now.

## Tests
- `buildTree`: nested pages, plain folders, hidden `assets/`, icon parsing.

## Acceptance
- Open a folder with sample files: the tree matches the folder on disk.
- Create a page: the file appears on disk.
- Reload: the folder reopens after the permission prompt.
