# 20 — Organize `src/` by feature

**Depends on:** 11. **Do this before 16:** tickets 16–19 then write code in the new layout.

## Goal
Replace the flat `src/` with a feature-based layout. Behavior does not change.

## Scope
- Move files to this layout, with each test next to the file it tests:
  ```
  src/
    main.tsx, App.tsx, index.css
    features/
      doc/        DocPage.tsx, frontmatter.ts (+test)
      board/      BoardPage.tsx, board.ts (+test), readBoard.ts
      sidebar/    Sidebar.tsx, tree.ts (+test)
      search/     SearchPalette.tsx, search.ts (+test)
      settings/   SettingsDialog.tsx, settings.ts (+test)
    components/   ConflictDialog.tsx, NameInput.tsx
    lib/          fs.ts, paths.ts, links.ts (+tests)
  ```
  - `components/` holds shared UI. Ticket 16's shared menu goes here.
  - `lib/` holds logic that several features use.
  - Files added since this ticket was written go where they fit by the same rules.
- Add the path alias `@/` for `src/`, in `tsconfig.app.json` (`paths`) and `vite.config.ts` (`resolve.alias`). Vitest must resolve it too.
  - Imports across folders use `@/...`. Imports inside the same feature folder stay `./...`.
- No barrel `index.ts` files. They slow Vite down and invite circular imports.
- Extract the sidebar tree from `App.tsx` into `features/sidebar/Sidebar.tsx`. `App.tsx` keeps the shell, routing and folder state.
- Do not split `BoardPage.tsx`. Ticket 16 rewrites its UI anyway.
- Use `git mv` so history follows the files.

## Out of scope
- Any behavior or style change.
- Splitting other large files.

## Acceptance
- `npm test`, `npm run build` and `npm run lint` are clean.
- Every test still runs (the same count as before the move).
- In the browser: open a folder, open a doc and a board, use Ctrl+K and Settings. Everything works as before.
