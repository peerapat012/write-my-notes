# v3-17 — AI chat

**Depends on:** 01, 04

## Goal
Chat with AI about your pages, and let it edit them, with or without approval.

## Scope
- An **AI** tab in the right panel (ticket 01). Web and desktop.
- No Gemini key: the v2 "Add Gemini key in Settings" message.
- Context:
  - the open page (doc text, or board text from the v2-06 extraction), sent automatically
  - more pages added with `@` (a page picker)
- Gemini function calling with three tools:
  - `edit_doc(path, markdown)`: the whole new content of a doc in context
  - `create_doc(path, markdown)`: a new doc
  - `add_to_board(kind, prompt)`: sticky, flow or outline on the open board, through the v1 ticket 13 generate code
  - AI cannot delete, rename or move pages, or edit pages outside the context. The app rejects such calls.
- Mode dropdown at the chat input: **Approve** (default) or **Auto**, stored in `localStorage`.
  - **Approve:** each change is a card in the chat with the page name, **Preview**, **Accept** and **Discard**. Preview shows the new doc read-only, using the ticket 04 preview screen. Nothing changes until Accept.
  - **Auto:** the change applies at once. The card shows **Undo**, which writes back the content from before the change.
  - Accepted and auto changes are normal edits (autosave, changed-file count).
- Chat storage: IndexedDB, per notes folder, not in the vault.
  - **New chat** starts a new chat. Old chats stay.
  - A history button lists chats from the last 7 days. Clicking one continues it.
  - Chats older than 7 days are deleted at app start.
  - The content from before each change is stored with its chat, so Undo works for 7 days.
- Calls go through `src/ai/gemini.ts`. The implementer adds function calling there.
- New UI: design it with `/impeccable` and `/ui-ux-pro-max`.

## Out of scope
- Deleting, renaming or moving pages by AI. Diff view. Chat sync between devices. Providers other than Gemini.

## Tests
- Tool call handling: an allowed edit, an edit to a page outside the context (rejected), a delete-like request (no tool).
- Approve and Auto flows on a fake vault: Accept writes, Discard does not, Undo restores.
- 7-day cleanup.

## Acceptance
- Open a doc, ask "add a summary at the top" in Approve mode: a card shows. Preview shows the new doc. Accept: the doc changes.
- In Auto mode the same request changes the doc at once. Undo brings back the old text.
- `@` a second doc and ask to edit it: it changes. Ask to edit a doc that is not in context: the app refuses.
- Ask on a board for a flow: elements appear (after Accept in Approve mode).
- Restart the app: yesterday's chat is in the history list. A chat 8 days old is gone.
