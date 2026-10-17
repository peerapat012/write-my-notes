# write-my-notes — v1 spec

A Notion-style notes app for developers, with Excalidraw-based whiteboards and AI on the board. Personal first; small teams share notes through a git repo.

## Goals

- Docs and boards live side by side in one page tree, and link to each other.
- Notes are plain files in a folder (Markdown, `.excalidraw`, images), so git diffs stay readable and nothing is locked into the app.
- No backend. GitHub (or any git remote) is the sync server.

## Non-goals (v1)

- Realtime collaboration, cursors, CRDTs.
- In-app git (commit/push buttons). Users run git in a terminal or VS Code. Built-in git arrives with the Tauri build.
- Mobile, Firefox, Safari.
- Mermaid, charts, AI in docs, board text in search, page cover images, Share button.
- BYOK. The Gemini key is built into the app (see Security).

## Platform and stack

- Web app: React + TypeScript + Vite. Tauri wrapper later.
- Desktop Chrome/Edge only (File System Access API).
- Styling: Tailwind CSS v4 (@tailwindcss/vite). No other CSS framework.
- Doc editor: Milkdown Crepe (markdown-native, slash menu, block handle).
- Board engine: `@excalidraw/excalidraw` (MIT), embedded with its default UI hidden.
- AI: Google Gemini API, called directly from the browser.
- Tests: Vitest for pure logic only. No E2E in v1.

## Storage model

The user picks a notes folder. The app stores the directory handle in IndexedDB and asks for permission again on the next visit.

```
notes/
  Project A.md            # doc page
  Project A/              # children of "Project A"
    Sub page.md
    Flow.excalidraw       # board page
  assets/
    img-<id>.png          # images from docs and boards
```

- A page is a `.md` file (doc) or a `.excalidraw` file (board).
- A page's children live in a sibling folder with the same name as the page.
- A folder without a matching page file shows up in the tree as a plain folder.
- Page icon (emoji):
  - doc: front matter `icon: 🐳`
  - board: top-level `"icon"` field in the `.excalidraw` JSON. The app adds this field after Excalidraw serializes the scene.
- Images are never embedded as base64:
  - doc: `![](assets/img-<id>.png)`
  - board: the scene's `files` entries point at `assets/` paths. The app loads them into Excalidraw's file store at open time and strips the data URLs before saving.
- Import/export `.md` needs no feature: pages already are `.md` files.

### Saving

- Autosave, debounced to ~500 ms after the last change. There is no Save button.
- On window focus, the app checks each open file's `lastModified` on disk (for example after a `git pull`):
  - Changed on disk, no unsaved edits: reload silently.
  - Changed on disk, with unsaved edits: ask "Keep mine / Load disk version".

### Links

- Links use paths relative to the file that holds them.
- Rename or move inside the app (sidebar drag, rename): the app rewrites every reference across all files, and moves the page's child folder along with it.
- A reference whose target is missing (for example after a rename outside the app) renders as a "broken link" state, not an error.

## App shell

- Left sidebar with the page tree:
  - drag to move
  - `+` to create a doc or a board
  - an emoji icon on each page
- Ctrl+K palette: searches page titles and `.md` content in memory (built at folder open, updated on save), then opens the result.
- Light and dark theme.
- Settings: theme and Gemini model name, stored in `localStorage`.

## Doc page

- Milkdown Crepe with:
  - slash menu
  - markdown shortcuts
  - code blocks with syntax highlighting
  - drag handle
- Paste or drop an image: the file is saved to `assets/` and a relative `![](...)` is inserted.
- Embed a board: `![](Flow.excalidraw)` renders as a preview image of the board. Clicking it opens the board.

## Board page

- Excalidraw with its default UI hidden, wrapped in our own UI (see the reference screenshots from the grilling session):
  - Top bar: back, title, undo/redo, zoom −/%/+, AI, Export.
  - Left toolbar: select, hand, text, pen, sticky note, rect, ellipse, diamond, line, arrow, eraser, emoji, image.
  - Floating style bar for the selection: fill colours, font (sans / handwritten), size presets.
- Defaults: `roughness: 0`, sans-serif font, dotted background.
- Sticky note: a filled, rounded rect with bound text and a default size.
- Emoji: a text element showing the chosen emoji.
- Drag a doc from the sidebar onto the board: it becomes a doc card showing the title and first lines. Double-clicking the card opens the doc. The card stores the doc's relative path.
- Export: PNG and SVG of the whole board, or of the selection when something is selected.

## AI (board only)

The AI panel opens from the top bar:

- **Edit N selected:** free-text instruction, such as rewrite, translate or fix grammar. It applies to the text of the selected elements.
- **Create new:**
  - Sticky notes: N notes from a prompt (slider for N).
  - Flow diagram: nodes and arrows from a prompt.
  - Outline: a heading plus bullet text block from a prompt.
- **Summarize this board:** creates a new doc page next to the board, with the summary and a link back to the board.

Implementation:

- One module, `src/ai/gemini.ts`. No provider abstraction.
- Gemini returns JSON constrained by a response schema.
- Pure functions map that JSON to Excalidraw element skeletons (`convertToExcalidrawElements`), placed at the viewport centre.
- The model name comes from Settings, with a current Flash model as the default.

## Security

- The Gemini key is read from `import.meta.env.VITE_GEMINI_API_KEY`, set in `.env.local`.
- `.env.local` and `.env*.local` are in `.gitignore` from the first commit. A `.env.example` holds the variable name only.
- Vite inlines the key into the JS bundle. Never deploy the build publicly, and never share the build. Run the app only on `localhost`, or in Tauri on your own machine.
- Restrict the key in the Google Cloud console to the Gemini API, with a low quota.
- Move to BYOK (key entered in Settings) before giving the app to anyone else.
- The notes folder never contains secrets.

## Tests (Vitest, pure logic)

- File list to page tree (pages, child folders, plain folders, `assets/` hidden).
- Link rewrite on rename and move, and broken-link detection.
- Board image round trip: data URL to `assets/` path and back.
- AI JSON to Excalidraw element skeletons, for each generation mode.
- Search index: add, update, query.

## v2 backlog

- Tauri wrapper with built-in git (status, commit, pull, push).
- BYOK, or a backend proxy for the AI key.
- Charts (tool and AI).
- Mermaid in docs.
- AI in docs (`/ai`).
- Board text in search.
- Realtime collaboration.
