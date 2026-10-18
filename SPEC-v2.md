# write-my-notes — v2 spec

v2 makes the app safe to give to other people. It removes the built-in key, ships a public web build and a Windows desktop build with git, and adds Mermaid, AI in docs, and board text in search.

Everything in [SPEC.md](SPEC.md) (v1) still holds unless this file says otherwise.

## Goals

- Anyone can use the app with their own Gemini key. No secret is in any build.
- Two builds from one codebase:
  - web: public on GitHub Pages, Chrome/Edge, File System Access API
  - desktop: Tauri 2, Windows, with built-in git
- Docs gain Mermaid diagrams and `/ai`.
- Ctrl+K finds text inside boards.

## Non-goals (v2)

- Charts (tool or AI).
- Realtime collaboration.
- macOS and Linux builds, code signing, auto-update.
- Git: diff view, branch switching, in-app conflict resolution, auto-commit, AI commit messages.
- OS keychain for the Gemini key.
- File system watcher. The v1 focus check stays.

## Storage seam (`Vault`)

- `src/lib/fs.ts` becomes a `Vault` interface that takes paths relative to the notes folder, as strings. It has operations like `list`, `read`, `write`, `move`, `delete` and `stat` (`lastModified`). The implementer picks the exact names.
- Two implementations:
  - `fsAccess`: the v1 code, using a `FileSystemDirectoryHandle`
  - `tauriFs`: Tauri `plugin-fs`
- Components never touch `FileSystem*Handle` types. They get a `Vault`.
- The app picks the implementation at startup (`'__TAURI_INTERNALS__' in window` or the equivalent check).
- The storage model on disk does not change.

## BYOK

- The Gemini key is a Settings field (password input), stored in `localStorage` next to theme and model.
- Production builds never read `VITE_GEMINI_API_KEY`. In `import.meta.env.DEV` only, the env key is a fallback when Settings has no key.
- With no key, the board AI panel and `/ai` show "Add Gemini key in Settings" with a link that opens Settings.
- There is no "Test key" button. A bad key shows Gemini's error, as v1 does.
- Settings text says the key stays in this browser and goes only to Google.

## Web deploy

- A GitHub Actions workflow builds on push to `main` and deploys to GitHub Pages: https://peerapat012.github.io/write-my-notes/
- Vite `base` is set for the Pages sub-path in CI only (`BASE=/write-my-notes/`). Local dev stays at `/`. Page URLs (`/page/...`) are built from `import.meta.env.BASE_URL`.
- Pages has no SPA fallback, so CI copies `index.html` to `404.html` to make deep links and reloads work.
- The web build has no git UI.

## Desktop (Tauri)

- Tauri 2. It wraps the same Vite app.
- Open folder: `plugin-dialog` folder picker. The app remembers the last folder path and reopens it on start.
- External changes: the v1 focus check (`lastModified`) through `Vault.stat`.
- UI is the same as the web build. Desktop-only changes:
  - custom title bar in the app theme (frameless window; page name, minimize, maximize, close). Changed from "native Windows title bar" after v2-07. Trade-off: the Windows 11 snap-layout flyout on the maximize button is lost; drag-to-edge and Win+Arrow snapping still work.
  - desktop copy for the empty state and open folder
  - app shortcuts must not clash with webview or Windows defaults
- No separate UI/UX redesign round in v2. The new git UI is designed in its own ticket.
- Release: a GitHub Actions workflow builds unsigned Windows installers (`.msi` / `.exe`) on a version tag and attaches them to a GitHub Release.

### Git (desktop only)

- The app runs the system `git` CLI through one Tauri command. The command allows only these subcommands: `status`, `add`, `commit`, `pull`, `push`, `rev-parse`. It always runs in the notes folder.
- Auth uses whatever the user has set up already (credential helper, SSH agent).
- If `git` is missing, or the folder is not a repo, the git UI shows that as a message and nothing else.
- Sidebar footer:
  - changed-file count, from `git status --porcelain`
  - refreshes on window focus and after each save (debounced)
- Commit all: a dialog for the message (required), then `git add -A` and `git commit -m`.
- Pull:
  1. Flush all pending saves.
  2. If the working tree is dirty, stop and show "Commit before pull".
  3. Run `git pull --rebase`.
  4. Open files reload through the v1 external-change logic.
- Push: `git push`.
- Any git failure (conflict, rejected push, auth) shows git's stderr and "Resolve in a terminal". The app does not try to fix it.

## Mermaid (docs)

- A fenced code block with language `mermaid` renders as a diagram under its code (Crepe `renderPreview`), updating as you type. The block's "Hide" button collapses the code. (Changed from "diagram only when not focused": Crepe cannot set preview-only for loaded blocks but not for new ones, and hiding the code while typing is worse.)
- The `.md` file keeps a plain fenced block. Nothing else is stored.
- `mermaid` is lazy-loaded the first time a doc has a mermaid block.
- The diagram theme follows the app's light/dark theme.
- A syntax error shows the error text in the block, not a diagram.
- Check Crepe's CodeMirror feature (`renderPreview`) before building a custom node view.

## AI in docs (`/ai`)

- A `/ai` item in the slash menu, and the same action on a text selection.
- Two modes:
  - **Selection:** a free-text instruction (rewrite, translate, fix grammar). The result replaces the selection.
  - **No selection:** a prompt. The result is inserted at the cursor.
- Gemini returns markdown text. No response schema.
- The result shows as a preview in a popover, with Accept and Discard. Nothing changes in the doc until Accept.
- Calls go through `src/ai/gemini.ts`. No new provider code.
- No chat and no "continue writing".

## Board text in search

- The search index also holds text from `.excalidraw` files: text elements, including the bound text of sticky notes and shapes.
- Board text results show the board title and a snippet.
- Choosing a result opens the board and zooms to that element (to its container for bound text).
- Index updates follow v1: built at folder open, updated on save and on rescan.

## Tests (Vitest, pure logic)

- `git status --porcelain` output to a changed-file count and list.
- Board text extraction, including bound text, and mapping each text back to the element to zoom to.
- `Vault` path handling (relative path to segments, edge cases like nested folders and `assets/`).
- No E2E.

## Docs and tickets

- Tickets live in [tickets/v2/](tickets/v2/README.md), numbered from `01`.
- Commit message: `ticket v2-NN: <title>`.
