# 07 — External change detection

**Depends on:** 03, 05

## Goal
Handle files that change on disk while the app is open, for example after a `git pull`.

## Scope
- On `window` focus, compare the `lastModified` of each open file against the value read last time.
- Changed on disk, not dirty: reload silently.
- Changed on disk, dirty: show a dialog with "Keep mine" (overwrite the disk) or "Load disk version".
- Rescan the tree on focus as well, to catch added or removed files.

## Acceptance
- Edit a file in VS Code, then focus the app: it shows the new content.
- With unsaved edits in the app, the dialog appears.
