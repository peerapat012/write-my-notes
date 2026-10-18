# v3-03 — Git allowlist + modes + Save version

**Depends on:** —

## Goal
Make committing friendly for non-developers, and open the git command to what v3 needs.

## Scope
- Settings: a **Mode** toggle, Simple (default) or Advanced, stored in `localStorage`.
- Footer button by mode:
  - Simple: **Save version**, message optional. An empty message becomes "Edited N pages" (N = changed-file count).
  - Advanced: **Commit**, message required (v2 behavior).
- Simple mode does not show the words "commit", "hash" or "branch" anywhere in the git UI. Pull and Push may get friendlier labels. The implementer picks the words.
- Allowlist (`allowed()` in `src-tauri/src/lib.rs`): add fixed shapes for what tickets 04–06 need:
  - `log` for one file with `--follow`, and `log --all` for the graph, each with a fixed `--format`, a count and a skip
  - `show <hash>:<path>`, and `show --name-status` for one commit
  - `init`, `remote add origin <url>`, `remote get-url origin`, `push -u origin HEAD`
  - Values go only in fixed positions. Paths come after `--`. Values that start with `-` are rejected. Hashes must be hex.
- Add a TS helper in `src/lib/git.ts` for each new shape, so tickets 04–06 only parse output.

## Out of scope
- The UI that uses `log`, `show`, `init` and `remote` (tickets 04–06).

## Tests
- Rust: every new shape is accepted. Flags in value positions, non-hex hashes and extra arguments are rejected.
- TS: the auto message from a changed-file count.

## Acceptance
- Simple mode: edit 2 pages, click Save version with no message: `git log` shows "Edited 2 pages".
- Advanced mode: Commit stays disabled with an empty message.
- Switching the mode changes the labels at once and survives a restart.
- `cargo test` passes.
