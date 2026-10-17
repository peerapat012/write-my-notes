# v2-10 — Windows release CI

**Depends on:** 07

## Goal
Other people can download and install the desktop app.

## Scope
- A GitHub Actions workflow on a version tag (`v*`): build on `windows-latest` with `tauri-apps/tauri-action`, and attach the `.msi` and `.exe` to a GitHub Release.
- The build is unsigned. The release notes say that Windows SmartScreen will warn, and how to get past it.
- The version comes from the tag. Keep `package.json` and `tauri.conf.json` in sync.
- No Gemini key is in the build or the workflow.

## Out of scope
- Code signing, auto-update, macOS, Linux.

## Acceptance
- Push the tag `v2.0.0`: the workflow is green, and the Release has both installers.
- Install on a clean Windows machine: the app opens a folder and edits pages, git works, and AI works with a key from Settings.
