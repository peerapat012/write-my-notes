# 01 — Scaffold

**Depends on:** —

## Goal
Get a running Vite + React + TS app with Vitest and safe env handling.

## Scope
- Create the Vite `react-ts` template in the repo root. Git is already set up: the branch is `main`, and `origin` is configured.
- Add Vitest with one sample test, and the `npm test` script.
- Add `.gitignore` containing `node_modules`, `dist`, `.env.local` and `.env*.local`.
- Add `.env.example` with `VITE_GEMINI_API_KEY=`.
- Add an empty app shell layout: sidebar on the left and a main area.

## Acceptance
- `npm run dev` serves the shell on localhost.
- `npm test` passes.
- `git check-ignore .env.local` confirms the file is ignored.
