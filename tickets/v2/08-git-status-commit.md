# v2-08 — Git status + commit

**Depends on:** 07

## Goal
See what changed and commit it, without leaving the desktop app.

## Scope
- One Tauri command that runs the system `git` CLI in the notes folder.
  - It allows only these subcommands: `status`, `add`, `commit`, `pull`, `push`, `rev-parse`. It rejects anything else.
  - It returns the exit code, stdout and stderr.
- Detect a missing `git`, or a folder that is not a repo (`git rev-parse`). Show that as a message in the footer and hide the actions.
- Sidebar footer (desktop only): the changed-file count from `git status --porcelain`.
  - It refreshes on window focus and after each save (debounced).
- Commit all: a dialog with a required message, then `git add -A` and `git commit -m <message>`. Refresh the count after.
- Any git failure shows stderr and "Resolve in a terminal".
- The web build shows no git UI.
- The footer and the Commit dialog are new UI. Design them with `/impeccable` and `/ui-ux-pro-max`, and match the ticket 16 look. Ticket 09 adds Pull and Push to the same footer, so leave room for them.

## Out of scope
- Pull and push (ticket 09), diff view, staging single files, branches, AI commit messages.

## Tests
- Parse `git status --porcelain` output into a count and paths, including renames and untracked files.

## Acceptance
- Edit two pages: the footer shows 2. Commit all with a message: the footer shows 0, and `git log` has the commit.
- In a folder without `.git`: the footer says so and shows no actions.
- With an empty message, Commit is disabled.
- The footer and the dialog look right in light and dark themes.
