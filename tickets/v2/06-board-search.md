# v2-06 — Board text in search

**Depends on:** —

## Goal
Ctrl+K finds text inside boards and jumps to it.

## Scope
- Extract text from `.excalidraw` scenes: text elements, including the bound text of sticky notes and shapes. Skip deleted elements.
  - Each hit keeps the id of the element to zoom to: the container for bound text, or the text element itself otherwise.
- Add board text to the search index, with the v1 lifecycle: built at folder open, updated on save and on rescan.
- Board text results show the board title, a board icon and a snippet. Ranking stays the same: title matches first.
- Choosing a board text result opens the board and zooms to the element (Excalidraw `scrollToContent` with fit and animate).

## Out of scope
- Doc card titles on boards. They are already doc titles.

## Tests
- Extraction: plain text; sticky bound text maps to its container; deleted elements are skipped.
- Index: board text is added, updated on save, and removed on delete.

## Acceptance
- Type a word that exists only on a sticky note: the board shows up, and Enter opens it and zooms to that sticky.
- Edit the sticky and let it save, then search the new word: it is found.
