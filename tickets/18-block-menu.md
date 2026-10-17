# 18 — Block action menu

**Depends on:** 16

## Goal
Clicking a block's drag handle in a doc opens a Notion-style action menu.

## Scope
- Clicking Crepe's block drag handle opens the shared menu component from ticket 16. Dragging keeps working as before.
- Menu contents:
  - a search field that filters the actions
  - **Turn into**: paragraph, heading 1–3, bullet list, numbered list, to-do, quote, code block
  - **Duplicate** (`Ctrl+D`)
  - **Delete** (`Del` while the menu is open)
  - a footer with the page's word and character count
- Shortcuts show right-aligned in the menu. `Ctrl+D` duplicates only while focus is in the editor, so it never reaches Chrome's bookmark shortcut.
- All actions are undoable with `Ctrl+Z`, and the saved markdown stays clean.

## Out of scope
- Color: markdown has no colors, and HTML in the file would make git diffs noisy.
- Copy link to block: markdown only has heading anchors. Later.
- Move to another page. Later.
- Suggest edits and Ask AI: AI in docs is a v1 non-goal.
- Last edited by: there are no users.

## Tests
- Pure function for word and character counts from markdown (ignoring front matter and markdown syntax).

## Acceptance
- Turn a paragraph into each block type: the `.md` file holds the matching markdown.
- Duplicate and delete a block, then undo: the doc is back to its original state.
- Typing in the search field narrows the actions.
