# v2-02 — BYOK Gemini key

**Depends on:** —

## Goal
Each user brings their own Gemini key. No key is ever in a production bundle.

## Scope
- Settings: a "Gemini API key" password input, stored in `localStorage` with the other settings.
  - Help text: the key stays in this browser and is sent only to Google.
- `src/ai/gemini.ts` reads the key from settings.
  - In `import.meta.env.DEV` only, fall back to `VITE_GEMINI_API_KEY` when settings has no key.
  - Production code must not reference `VITE_GEMINI_API_KEY`, so Vite cannot inline it.
- `AiPanel.tsx` no longer reads `import.meta.env` itself. With no key, it shows "Add Gemini key in Settings" with a link that opens Settings.
- Update the `.env.example` comment: the key there is a dev-only fallback.
- Update the Security section of `SPEC.md` to point to `SPEC-v2.md`.

## Out of scope
- A "Test key" button.
- OS keychain.

## Tests
- Settings: the key saves and loads; a missing key reads as empty.
- Key lookup: the settings key wins; the env fallback applies only in dev. Inject the dev flag so the test stays pure.

## Acceptance
- Set `VITE_GEMINI_API_KEY` in `.env.local`, run `npm run build`, then search `dist/` for the key value: it is not found.
- With no key: the AI panel shows the message, and the link opens Settings.
- With a key entered in Settings: board AI works.
