# v2-07 — Tauri wrapper + `tauriFs`

**Depends on:** 01

## Goal
The same app runs as a Windows desktop app on Tauri 2.

## Scope
- Add Tauri 2 (`src-tauri/`) wrapping the Vite app. `npm run tauri dev` and `npm run tauri build` work.
- `tauriFs`: a `Vault` implementation on `@tauri-apps/plugin-fs`, scoped to the chosen notes folder.
- Open the folder with `@tauri-apps/plugin-dialog`. Remember the last folder path and reopen it on start.
- Pick the `Vault` implementation at startup by detecting Tauri.
- External changes: the v1 focus check, through `Vault.stat`.
- Tauri capabilities: only what the app uses (fs inside the notes folder, dialog). No shell yet.
- Gemini calls work from the Tauri webview. Check CSP and allowed origins.
- Desktop UX:
  - Use the native Windows title bar. No custom frameless window.
  - Review `EmptyState` and open-folder copy for desktop: no permission re-prompt, and the last folder reopens on start. Keep the web copy as it is.
  - Check that app shortcuts (Ctrl+K and the others) are not taken by the webview or Windows. Disable webview defaults that get in the way, such as the reload shortcut and the browser context menu outside editors.

## Out of scope
- Git (tickets 08 and 09).
- Installer CI (ticket 10).

## Acceptance
- In `npm run tauri dev`: open a folder; create, edit, rename, move and delete docs and boards; paste images; search; use board AI.
- Restart the app: the last folder opens without a picker.
- Edit a file outside the app, then focus the app: it reloads the file, or asks when there are unsaved edits.
- The web build (`npm run dev`) still works as before.
- The window has the native title bar, with snap layouts working.
- Ctrl+K opens the palette, and F5 or Ctrl+R does not reload the app.
