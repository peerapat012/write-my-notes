# v3-06 — Setup wizard

**Depends on:** 03, 04

## Goal
Turn on history and connect GitHub without a terminal.

## Scope
- When git is missing or the folder is not a repo, the footer and the History tab show **Set up history**. It opens the wizard.
- Steps. Skip the ones already done:
  1. **Git missing:** explain that history needs Git for Windows. Link to https://git-scm.com/download/win. "Check again" re-runs detection.
  2. **Not a repo:** "Turn on history" runs `git init`, `git add -A`, `git commit -m "First version"`.
  3. **Remote (optional):** a field for a GitHub repo URL, then `git remote add origin <url>` and `git push -u origin HEAD`. "Skip" keeps local history only. Explain how to create an empty repo on GitHub and where to copy its URL.
- Auth: Git Credential Manager shows its own login. On failure, show git's stderr and "Resolve in a terminal", as in v2.
- Opening the external link may need a Tauri opener plugin. The implementer checks.
- New UI: design it with `/impeccable` and `/ui-ux-pro-max`.

## Out of scope
- Installing git. Creating the GitHub repo. OAuth.

## Tests
- Step selection from (git found?, is repo?, has remote?).

## Acceptance
- A fresh folder: the wizard turns on history, and `git log` shows "First version".
- With an empty GitHub repo URL: Push succeeds after the GCM login, and the repo has the notes.
- With git not on `PATH`: step 1 shows and the link opens in the browser.
- Skip at step 3: the footer shows the normal git UI with no remote.
