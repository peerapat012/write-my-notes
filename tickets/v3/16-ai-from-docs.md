# v3-16 — AI from docs on boards

**Depends on:** 15

## Goal
Turn docs on a board into stickies, flows or outlines with AI.

## Scope
- When the selection contains one or more doc cards, the board AI panel (v1 ticket 13) shows them as input (titles).
- Generate sticky, flow or outline uses the docs' text plus the user's prompt.
- Generated elements go to the right of the selected cards and do not overlap them.
- Reuse the v1 ticket 13 generate code and `src/ai/gemini.ts`. No new provider code.
- No key: the v2 "Add Gemini key in Settings" message.

## Out of scope
- Writing back to the doc. Chat.

## Tests
- Prompt building with one and several docs.
- Placement to the right of the selected cards' bounding box.

## Acceptance
- Select a meeting-notes card, ask for a flow: a flow appears to the right of the card, built from the doc's content.
- Select two cards: the result uses both.
