# v2-03 — Deploy web build to GitHub Pages

**Depends on:** 02

## Goal
A public web build that anyone can open in Chrome or Edge.

## Scope
- GitHub Actions workflow: on push to `main`, run `npm ci`, `npm test` and `npm run build`, then deploy `dist/` to GitHub Pages (`actions/deploy-pages`).
- Set Vite `base` to the Pages sub-path (`/write-my-notes/`) in CI only, through an env var or `--base`. Local dev stays at `/`.
- Check that app assets, fonts and Excalidraw assets load under the sub-path.
- Confirm the dev-only `/dev/ui` route is not in the build.
- Add the Pages URL to `SPEC-v2.md`.

## Out of scope
- Custom domain.
- Desktop build.

## Acceptance
- The workflow runs green on `main`.
- The Pages URL loads. It opens a notes folder, edits a doc and a board, and board AI works with a key from Settings.
- No Gemini key exists in the workflow or in the repo's Actions secrets.
