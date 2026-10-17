# 10 — Ctrl+K search

**Depends on:** 03

## Goal
Find any page fast.

## Scope
- In-memory index of titles and `.md` content: built when the folder opens, updated on save and on rescan.
- Ctrl+K palette:
  - results ranked with title matches first, then content matches with a snippet
  - arrow keys and Enter open the selected page
- No board text in search (v2).

## Tests
- Index: add, update, remove, and query ranking.

## Acceptance
- With ~300 sample files, results appear as you type, without noticeable lag.
