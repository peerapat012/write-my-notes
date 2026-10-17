# 12 — AI: client + edit selected

**Depends on:** 06, 11

## Goal
Add the Gemini client and the first AI action on the board.

## Scope
- `src/ai/gemini.ts`:
  - reads `import.meta.env.VITE_GEMINI_API_KEY` and the model name from settings
  - calls Gemini with a JSON response schema
  - one module, no provider abstraction
- If the key is missing, show a clear message in the panel instead of failing silently.
- AI panel (the top-bar AI button opens it):
  - prompt textarea
  - "Edit N selected" button
- Edit selected: send the text of the selected elements and the instruction, receive `[{id, text}]`, and update those elements in place. A single undo step reverts the edit.
- Loading and error states.

## Tests
- Pure function that applies the `[{id, text}]` response to the elements.

## Acceptance
- Select 3 stickies and type "translate to Thai": all 3 change.
- Undo reverts the change.
