# v2-09 — Git pull + push

**Depends on:** 08

## Goal
Sync with the remote from the desktop app.

## Scope
- Pull button:
  1. Flush all pending saves.
  2. If the working tree is dirty, stop and show "Commit before pull".
  3. Run `git pull --rebase`.
  4. Reload open files through the v1 external-change logic. Rescan the page tree and the search index.
- Push button: `git push`.
- A busy state while a command runs. The buttons are disabled meanwhile.
- On failure (conflict, rejected push, auth, no upstream): show stderr and "Resolve in a terminal".
- Auth is whatever the user has set up (credential helper, SSH agent). The app never asks for credentials.

## Out of scope
- Conflict resolution, fetch-only, choosing a branch.

## Acceptance
- Push a commit from another clone, then Pull in the app: the open doc shows the new content, and the tree shows new pages.
- Commit in the app, then Push: the remote has the commit.
- With a dirty tree, Pull shows "Commit before pull" and runs nothing.
- Make a conflict, then Pull: the app shows git's error and keeps working.
