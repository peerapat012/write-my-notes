# v2-05 — AI in docs (`/ai`)

**Depends on:** 02

## Goal
Use Gemini inside docs: edit a selection, or generate text at the cursor.

## Scope
- Entry points:
  - `/ai` in the slash menu
  - an "AI" action when text is selected (toolbar item or shortcut; pick what fits Crepe)
- A popover with a text input:
  - **Selection:** an instruction (rewrite, translate, fix grammar). The result replaces the selection.
  - **No selection:** a prompt. The result is inserted at the cursor.
- Gemini returns markdown text, with no response schema. Send the selection as markdown.
- Show the result as a preview in the popover, with Accept and Discard. Nothing changes in the doc until Accept. Esc means Discard.
- The popover has loading and error states. With no key, it shows the BYOK message from ticket 02.
- All calls go through `src/ai/gemini.ts`. Add a small pure function that builds the prompt.

## Out of scope
- Chat, "continue writing", whole-doc context.

## Tests
- Prompt building for both modes: instruction with selection, and prompt only.

## Acceptance
- Select a paragraph, ask "translate to Thai", and Accept: the paragraph is replaced and the doc autosaves.
- On an empty line, run `/ai` with "a checklist for a release": a markdown list appears after Accept.
- Discard leaves the doc unchanged, and no autosave runs.
