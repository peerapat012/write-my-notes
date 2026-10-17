# 14 — AI: summarize board to doc

**Depends on:** 12, 03

## Goal
Turn a board into notes.

## Scope
- "Summarize this board": send all text on the board (stickies, text, doc-card titles) and receive markdown.
- Create a new doc next to the board, named `<Board name> summary.md`. Its first line links back to the board, followed by the summary.
- Open the new doc.

## Acceptance
- The summary doc appears in the tree, and its link opens the board.
