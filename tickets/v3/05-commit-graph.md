# v3-05 — Commit graph

**Depends on:** 04

## Goal
Developers can see the whole repo history as a graph.

## Scope
- Advanced mode only. A "History" view for the whole repo, opened from the git footer.
- Source: `git log --all` with parents and refs. The app lays out and draws the lanes itself. No new dependency unless the implementer finds a small one worth it.
- 200 commits per load, then "Load more".
- Row: lanes, message, refs (branches, tags, `HEAD`), author, date, short hash.
- Clicking a commit lists its changed files (`git show --name-status`).
- Clicking a file opens the ticket 04 read-only preview at that commit.
- Read-only. No checkout and no branch actions.
- New UI: design it with `/impeccable` and `/ui-ux-pro-max`.

## Out of scope
- Diff, checkout, branch create/switch/delete.

## Tests
- Lane layout for linear history, a branch, and a merge.
- Parse refs (`HEAD -> main`, `origin/main`, `tag: v1`).

## Acceptance
- A repo with a merged branch shows two lanes joining at the merge commit.
- Clicking a commit lists its files. Clicking a file shows that version read-only.
- Simple mode has no entry to this view.
