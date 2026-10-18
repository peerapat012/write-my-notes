# write-my-notes — v3 spec

v3 makes the app work for people who are not developers. It ships in three releases:

- **v3**: page history built on git, a commit graph for developers, a right panel with Outline and History, Trash, and a setup wizard for git.
- **v3.1**: a lighter new-page flow with an icon picker, task blocks, templates, daily notes, favorites, an All pages view, print to PDF, and backlinks.
- **v3.2**: doc cards on boards, AI that turns docs into board content, and an AI chat that can edit pages.

Everything in [SPEC.md](SPEC.md) (v1) and [SPEC-v2.md](SPEC-v2.md) still holds unless this file says otherwise.

## Goals

- A non-developer can see older versions of a page and bring one back, without knowing git.
- A developer can see the whole repo history as a graph.
- Deleted pages can be recovered.
- Setting up git does not need a terminal.
- Docs gain tasks with a status, templates, and daily notes.
- A board can show docs and use them as AI input.
- An AI chat that sees the open page and can edit pages, with or without approval.

## Non-goals (v3)

- Auto-commit (on idle, on close, or on a timer).
- Diff view. Older versions are shown rendered, not as a diff.
- Checkout, branch switching, reset, in-app conflict resolution.
- Creating a GitHub repo from the app (no OAuth).
- Installing git from the app.
- History on the web build.
- Formulas, merged cells, or column types in tables. The GFM table that Crepe already has stays as it is.
- Custom task statuses or custom task columns. Task rows that open as pages.
- Collections. A Filter button in All pages. A "Recent" list.
- A doc and a board as one page with a Doc/Board switch (AFFiNE style).
- Rendering doc content in board PNG/SVG exports.
- Browser-style page tabs. Tags and Collections sections in the sidebar.
- AI deleting, renaming or moving pages. Chat sync between devices. AI providers other than Gemini.
- A full UI redesign. New UI borrows from AFFiNE where a ticket adds it (see UI design).

## Modes: simple and advanced

- Settings gets a "Mode" toggle: **Simple** (default) or **Advanced**. It is stored in `localStorage` next to theme and model.
- Simple mode never shows the words "commit", "hash" or "branch".
- Advanced mode adds the commit graph and uses git words.

## v3 — History and git (desktop)

### Git allowlist

The v2 Tauri `git` command keeps its rule: it accepts only fixed argument shapes, listed in `allowed()` in `src-tauri/src/lib.rs`.

- New shapes for `log`, `show`, `init`, `remote` and `push -u origin HEAD`. The implementer picks the exact flags.
- Values that come from the app or the user (a path, a commit hash, a URL, a message) go only in fixed positions.
  - Paths always come after `--`.
  - A value that starts with `-` is rejected.
  - A commit hash must be hex.
- The Rust tests cover every new shape and at least one rejected variant of each.

### Save version

- The v2 Commit button changes by mode:
  - **Simple:** "Save version". The message is optional. If it is empty, the app writes "Edited N pages", where N is the changed-file count.
  - **Advanced:** "Commit". The message is required, as in v2.
- Both run `git add -A` and `git commit -m`, as in v2.
- Pull and Push do not change. Simple mode may relabel them (for example "Get updates" and "Upload"). The implementer picks the words.

### Right panel

- One panel on the right side of the page. Its tabs: **Outline** and **History** (v3), and **AI** (v3.2).
  - Outline: web and desktop, docs only.
  - History: desktop only, docs and boards.
  - AI: web and desktop, docs and boards. See AI chat.
  - A tab with nothing to show is hidden. On a board in the web build, the panel has no tabs, so the toggle is hidden.
- A toggle button at the top right opens and closes the panel. The open/closed state is stored in `localStorage`. The default is closed.

### Outline

- Lists the doc's headings (H1–H6), indented by level. No other blocks.
- Clicking a heading scrolls the doc to it.
- While the doc scrolls, the heading of the section in view is highlighted.
- It updates as the doc changes.

### Page history

- The History tab lists the page's versions: date, time and message, newest first.
  - Source: `git log --follow -- <path>`, so history continues across renames.
  - 50 versions per load, with a "Load more" button.
  - Unsaved and uncommitted changes are not a version.
- Clicking a version shows that version read-only in the page area, with a bar: "Viewing version from <date>", **Restore** and **Back to current**.
  - Content comes from `git show <hash>:<path>`. `<path>` is the file's path at that commit, which can differ after a rename.
  - Doc: rendered with the doc editor in read-only mode.
  - Board: rendered with Excalidraw in view mode.
  - Images load from the current `assets/`. A missing image shows the normal broken state.
- **Restore** writes the old content over the current file with `Vault.write`. That is a normal edit: autosave, the changed-file count goes up, and the user saves a version as usual.
  - No `git checkout`, `git reset` or `git revert`.
  - The open page reloads with the restored content.
- Not a repo, or git missing: the History tab shows the "Set up history" button (see the wizard).

### Commit graph (advanced mode)

- A "History" view for the whole repo, opened from the sidebar git footer. Advanced mode only.
- Source: `git log --all` with parents and refs. The app draws the graph lanes itself. 200 commits per load, with "Load more".
- Each row: graph lanes, message, refs (branches, tags, `HEAD`), author, date, short hash.
- Clicking a commit lists the files it changed (`git show --name-status`).
- Clicking a file opens the read-only preview from page history, at that commit.
- Read-only. No checkout, no branch actions.

### Setup wizard

- In v2, the sidebar footer shows a message when git is missing or the folder is not a repo. In v3 it shows a **Set up history** button that opens the wizard. The History tab shows the same button.
- Steps. The wizard skips steps that are already done:
  1. **Git missing:** explain that history needs Git for Windows, with a link to https://git-scm.com/download/win and a "Check again" button. The app does not install git.
  2. **Not a repo:** "Turn on history" runs `git init`, then `git add -A` and `git commit -m "First version"`.
  3. **No remote (optional):** a field for a GitHub repo URL, then `git remote add origin <url>` and `git push -u origin HEAD`. "Skip" leaves the folder as local history only.
- Auth: whatever Git for Windows sets up. Git Credential Manager shows its own login window. The app shows git's stderr on failure, as in v2.
- The wizard text says what to create on GitHub (an empty repo) and where to copy its URL from.

### Trash (web and desktop)

- Deleting a page (v1 ticket 17) moves it to `.trash/` and keeps its path: `Project A/Sub page.md` becomes `.trash/Project A/Sub page.md`. Its child folder moves with it.
- `.trash/` does not show in the sidebar tree, Ctrl+K, or All pages.
- Links to a page in Trash render as broken links, as in v1.
- A **Trash** item in the sidebar opens a Trash view:
  - It lists the trashed pages (top level of each trashed tree), with the original path.
  - **Restore** moves the page and its child folder back to the original path. If that path is taken, the name gets " (restored)".
  - **Empty trash** deletes everything in `.trash/` after a confirm dialog.
  - There is no auto-delete.
- `.trash/` is a normal folder for git and is committed like any other.
- The delete confirm text changes from "permanently" to "move to Trash".

## v3.1 — Notes (web and desktop)

### New page

- New doc creates `Untitled.md` at once (`Untitled 2.md` and so on if taken), opens it, and focuses the title. The placeholder is "Title". Enter or blur renames the file. New board does the same with `Untitled.excalidraw`. The sidebar name input for new pages goes away.
- A page with no icon shows a small "Add icon" link above the title (on hover, and always while the doc is empty). A page with an icon shows it large. Either opens the icon picker. Docs and boards.
- Icon picker: a popover with **Emoji** and **Icons** tabs, and **Remove**.
  - Emoji: search, recently used, categories, system emoji. An emoji picker library that works offline (no CDN at runtime).
  - Icons: Lucide, with search and a color from a fixed palette of about 8. Icons load lazily.
- Storage. Old files keep working unchanged:
  - emoji stays `icon: 🐳`
  - Lucide is `icon: lucide:rocket` plus `iconColor: blue` (a palette name, mapped to light and dark values)
  - boards use top-level `"icon"` and `"iconColor"`
- Every place that shows a page icon renders both kinds: sidebar, Ctrl+K, page header, All pages, Favorites, backlinks.
- Created and Tags move into a collapsible **Info** box under the title. One `localStorage` value for all pages. The default is collapsed.

### Tables

No change. The GFM table from Crepe (`/` → Table) is the table feature. Ticket v3-09 confirms it is in the slash menu.

### Task block

- `/` → **Tasks** inserts a task block.
- In the `.md` file it is a fenced code block with language `tasks`, holding a GFM table:

  ````
  ```tasks
  | Task | Status | Tags |
  |---|---|---|
  | Create Adventure MainScreen | In progress | ui |
  | Create World Map Screen | Not started | ui, map |
  ```
  ````

  - Columns are fixed: Task, Status, Tags.
  - Status is one of `Not started`, `In progress`, `Done`. Any other value shows as Not started and is kept as written until the row is edited.
  - Tags are comma-separated.
  - A `|` in a cell is written as `\|`.
- In the app, the block renders as an editable table:
  - Status is a colored pill: Not started (gray), In progress (blue), Done (green).
  - Tags are pills.
  - Add a row, delete a row, edit a name, change a status, edit tags. The implementer picks the UI.
  - Every edit rewrites the fenced block's text. Nothing else is stored.
- Check Crepe's CodeMirror `renderPreview` (used for Mermaid) first. Use a custom node view only if the preview cannot be made editable.
- Rows are text. They do not open as pages.
- Task text is in the `.md`, so Ctrl+K already finds it.

### Templates

- **Built-in templates** live in code: Meeting notes, Journal, Task list. The Task list template includes a task block.
- **User templates** are `.md` files in `.templates/` in the notes folder.
  - **Save as template** in a doc's page menu copies the doc body (without `created`) to `.templates/<page name>.md`. If the name is taken, the app asks to replace it.
  - `.templates/` does not show in the sidebar, Ctrl+K, or All pages.
- New doc always creates a blank doc (see New page). The template picker opens from the Start row and from a "New from template" item in the new-page menu: built-in templates first, then user templates.
- An empty doc shows a row under the body: "Start: **With AI** · **Template**". With AI opens `/ai`. Template opens the template picker. The row hides once the doc has content.
- A doc made from a template gets a fresh `created`. Whether templates fill in other values, such as today's date, is the implementer's choice.
- Boards have no templates.

### Daily note

- A **Today** button in the sidebar opens `Daily/YYYY-MM-DD.md` for the local date.
- If the file does not exist, the app creates it from the Journal template. It also creates `Daily/` if needed.
- `Daily/` is a plain folder in the tree (v1 rule: a folder without a matching page file).

### Favorites

- A star in each page's menu, and in All pages, adds or removes a favorite.
- A **Favorites** section at the top of the sidebar lists favorites in the order they were added.
- Stored in `localStorage`, keyed per notes folder (folder path on desktop, folder name on web). Favorites do not sync between devices.
- Rename and move update the stored path. Moving a page to Trash removes it from favorites.

### All pages

- An **All pages** item in the sidebar opens a list of every doc and board in the main area.
- Columns:
  - Title, with a one-line preview under it.
    - Doc: about the first 100 characters of the body.
    - Board: board text, from the v2-06 board text extraction.
  - Tags (docs).
  - Created: docs show `created`. Boards show "—".
  - Updated: `lastModified` from `Vault.stat`.
  - Star (favorite).
- Rows are grouped by Updated: Today, Yesterday, This week, Older.
- Tabs: All, Doc, Board.
- Clicking the Title, Created or Updated header sorts by that column. The default is Updated, newest first.
- Clicking a row opens the page.
- There is no Recent list. All pages sorted by Updated does that job.

### Print to PDF

- **Print / Save as PDF** in a doc's page menu calls `window.print()`.
- Print CSS hides the app shell: sidebar, title bar, right panel, toolbars. Only the doc prints: title, properties, body, images, Mermaid diagrams, tables and task blocks.
- The user picks "Save as PDF" in the print dialog (browser or WebView2).
- Docs only. Boards already export PNG/SVG.

### Backlinks

- A collapsible **Linked from** section under the doc body lists the pages (docs and boards) that link to or embed this page. Clicking one opens it. Hidden when nothing links here.
- Built on the reference finder from the rename/move rewrite (v1 ticket 08). Pages in `.trash/` and `.templates/` do not count.
- Updates on save and on the focus check. Docs only.

## v3.2 — AI and docs on boards (web and desktop)

### Doc card

- A board can hold **doc cards**: an element that shows a doc's content read-only on the canvas.
- Add a doc card in one of two ways:
  - a "Doc" tool in the board toolbar, which opens a page picker
  - dragging a doc from the sidebar onto the board
- A doc card moves, resizes, and deletes like any other element.
- Double-clicking a card opens the doc.
- The card shows the doc's current content. It updates when the doc is saved in the app, and on the focus check.
- Storage: an Excalidraw `embeddable` element. Its `link` holds the doc path relative to the board file.
  - The rename/move link rewrite (v1 ticket 08) also rewrites these links.
  - The app renders the card with `renderEmbeddable` and allows the link with `validateEmbeddable`. Both exist in Excalidraw 0.18.
- A missing target (deleted, in Trash, renamed outside the app) shows the v1 broken-link state on the card.
- PNG/SVG export (v1 ticket 15): a doc card exports as a box with the doc title, not its content.
- Doc card text is not board text for Ctrl+K. The doc itself is already indexed.

### AI from docs

- When the board selection contains one or more doc cards, the board AI panel (v1 ticket 13) shows the selected docs as its input.
- Generate sticky, flow or outline uses the docs' text, plus the user's prompt, as input.
- Generated elements go to the right of the selected cards, without overlapping them.
- Calls go through `src/ai/gemini.ts` and reuse the v1 ticket 13 generate code.

### AI chat

- An **AI** tab in the right panel. Uses the BYOK Gemini key. No key: "Add Gemini key in Settings".
- Context: the open page (doc text, or board text) is sent automatically. `@` adds more pages. The rest of the vault is not sent.
- Gemini function calling, three tools:
  - `edit_doc(path, markdown)`: the whole new content of a doc in context
  - `create_doc(path, markdown)`: a new doc
  - `add_to_board(kind, prompt)`: sticky, flow or outline on the open board, through the v1 ticket 13 generate code
- AI cannot delete, rename or move pages, or edit pages outside the context. The app rejects such calls.
- Mode, chosen in a dropdown at the chat input and stored in `localStorage`:
  - **Approve** (default): each change is a card with **Preview**, **Accept**, **Discard**. Preview reuses the read-only screen from page history. No diff. Nothing changes until Accept.
  - **Auto**: the change applies at once. The card shows **Undo**, which writes back the content from before the change.
- Accepted and auto changes are normal edits: autosave, and the changed-file count goes up.
- Chats live in IndexedDB, per notes folder, not in the vault and not in git. No server.
  - **New chat** starts a chat. A history button lists the last 7 days of chats. Clicking one continues it.
  - Chats older than 7 days are deleted at app start.
  - The content from before each change is stored with its chat, so Undo works for 7 days.

## Tests (Vitest, pure logic; Rust unit tests for the allowlist)

- Git allowlist: every new shape is accepted. Flags in value positions, non-hex hashes and extra arguments are rejected.
- Parse `git log` output for page history, including the path at each commit across renames.
- Parse `git log --all` output and lay out graph lanes (linear, branch, merge).
- Auto message "Edited N pages" from the changed-file count.
- Trash: original path to trash path and back, child folder, " (restored)" when the name is taken.
- Outline: headings from markdown, with levels.
- Task block: parse and serialize the `tasks` table, unknown status, `\|` escapes, tags.
- All pages: grouping by Updated (Today, Yesterday, This week, Older) and sorting.
- Favorites: path update on rename and move, removal on Trash.
- New page: `Untitled` name picking. Icon front matter (emoji, `lucide:` form, `iconColor`) read, write and remove.
- Doc card: link rewrite on rename and move.
- Backlinks: doc links, board embeds, nested relative paths, trashed pages excluded.
- AI chat: tool calls inside and outside the context, Accept/Discard/Undo on a fake vault, 7-day cleanup.
- No E2E.

## UI design

New UI: the new-page header and icon picker, the Info box, the right panel, the history bar, the commit graph, the wizard, Trash, the task block, the template picker, Favorites, All pages, backlinks, the doc card, and the AI chat. Design it with `/impeccable` and `/ui-ux-pro-max`. Match the v1 ticket 16 look, in light and dark themes.

Borrow layout ideas from AFFiNE where a ticket adds UI. Do not redesign what exists, and do not copy AFFiNE colors, fonts or branding.

- Sidebar, top to bottom: Search, All pages, Today, Settings / Favorites / page tree / Others: Trash, Templates.
- The right panel toggle sits at the top right of the page header. Panel tabs sit at the top of the panel.

## Docs and tickets

- Tickets live in [tickets/v3/](tickets/v3/README.md), numbered from `01` across all three releases.
- Commit message: `ticket v3-NN: <title>`.
- Releases: v3 is done after ticket 06, v3.1 after ticket 14, v3.2 after ticket 17. The owner picks the tag names (the v2-10 release CI builds on any version tag).
