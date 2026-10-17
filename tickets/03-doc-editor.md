# 03 — Doc editor + autosave

**Depends on:** 02

## Goal
Edit `.md` pages with a Notion-style editor that saves on its own.

## Scope
- Use Milkdown Crepe with:
  - slash menu
  - markdown shortcuts
  - code blocks with syntax highlighting
  - block drag handle
- Load the file content, and keep front matter (such as `icon`) intact when saving.
- Page title = file name. Editing the title is ticket 08.
- Emoji icon picker at the top of the page writes the front matter `icon`.
- Autosave, debounced to ~500 ms, writing through the file handle.
- Track a "dirty" state per open file. Ticket 07 needs it.

## Acceptance
- Typing, then reloading, keeps the content.
- `git diff` on the file shows clean markdown, with no editor noise.
- A code block with a language is highlighted.
