# write-my-notes — v3.4 spec: editor zone catches up with AFFiNE

v3.4 improves the **editor zone** (the doc body and everything drawn inside it). It does not touch the sidebar, the top bar, boards, git, or AI.

Everything in [SPEC.md](SPEC.md), [SPEC-v2.md](SPEC-v2.md), [SPEC-v3.md](SPEC-v3.md) and [SPEC-v3.3.md](SPEC-v3.3.md) still holds unless this file says otherwise. This file lifts two v3.3 non-goals: **Kanban and Calendar views** and **column resize** (see tickets 06 and 02).

## Reference

- A side-by-side screenshot from the request: AFFiNE (left) and this app (right), same kind of page (page title, Table view, to-do list, card, table).
- The AFFiNE source scan, drawn at `/dev/ui/affine` (`src/DevUiAffine.tsx`). Sizes, radii, spacing, gaps and animation durations there are read from the AFFiNE source (`*.css.ts` and Lit styles). Colors there come from the public `toeverything/design` repo.
- **Decision (from the request):** use the **same spec** as AFFiNE for size, spacing, radius, motion and structure. **Keep this app's colors, font (Geist) and icon set (Lucide).** "Same spec" does not mean AFFiNE's branding or its blue.

## What the screenshot shows (right side, this app)

These are observations from one screenshot. Items marked **verify** may come from an older build; ticket 01 starts by reproducing them on `main`.

1. The ```` ```datatable ```` code block is visible (language label, line numbers, the raw `@schema {...}` line and the pipe rows), above the rendered table. The source is meant to be hidden by `.tasks-source` (`src/index.css`). **verify**
2. A paragraph of raw text, `@schema {"title":"Untitled",...} | Title | Column | ...`, is shown below the table. **verify**
3. The Data table has no row dividers or a visible grid, empty rows are collapsed to a few pixels, and the title column has a bare "T" glyph with no label. Column headers have no clear surface or hover. AFFiNE shows a frameless grid with lines inside only, 34px rows and header, type icons, and a bottom row with "+ New Record" and column stats.
4. There are no view tabs in the Data table header (AFFiNE: Table, Kanban, Calendar).
5. The block handle shows `+` and a grip, but there is no block-selected floating toolbar for cards and embeds (AFFiNE: Open, copy, edit, Card view, ... menu).
6. The page has no large title, no "Add icon" and no Info (properties) row inside the editor zone.

## Goals

- The Data table reads like AFFiNE's Table view: a frameless grid (lines inside only), fixed row and header height, type icons, typed cells, a stats row.
- Source blocks (`datatable`, `tasks`, card links) never show their raw text.
- The block chrome (handle, slash menu, floating toolbars, headings, callout, code block) matches AFFiNE's spacing and sizes.
- The page head (title, icon, Info) lives at the top of the editor zone.
- The files stay plain Markdown. No format change in tickets 01 to 05.

## Non-goals (v3.4)

- Filter, group, formulas, merged cells, rows as pages, real-time collaboration UI.
- A new color palette, font or icon set.
- AFFiNE's edgeless (whiteboard) mode, database blocks stored as Yjs, or its AI features.
- Mobile layouts.

## Spec values to use (from the AFFiNE source)

| Thing | Value |
| --- | --- |
| Table column | width 180, min 100 |
| Table header, stats bar, row min height | 34 |
| Table left rail (drag, row select) | 24 |
| Add-column button | min width 40 |
| Header cell | padding 6, 14px, secondary text, hover fill |
| Scrollbar (horizontal) | 8px, thumb only on hover |
| Select pill | radius 4, padding 1×8, 12px |
| Slash menu | width 280, padding 8/4/8/8, radius 8, max height 390, group label 12/500, icon tile 28×28 radius 4 with a 1px border, gap 10 |
| Menu | min width 180, radius 8, padding 8, gap 4, item padding 4, radius 4, line height 22, icon 20 |
| Floating toolbar | height 36, gap 8 |
| Headings | H1 28/700, H2 26/600, H3 24/600, H4 22, H5 20, H6 18; body 15; line height `1em + 8px` |
| Heading spacing | H1 top 18 bottom 10; H2 top 14; H3 top 12 |
| Callout | padding 5×10, radius 8, emoji box 24, margin 8×0 |
| Modal | radius 12, padding 20×24; enter 150ms, fade plus `translateY(-2%) scale(.96)` |
| Tooltip | padding 5×12, radius 4, 14px, line height 22, enter 200ms |

If a value here conflicts with a token already in `src/index.css`, the implementer keeps the token name, changes its value, and lists the change in the ticket's commit message.

## Tickets

See [tickets/v3.4/README.md](tickets/v3.4/README.md).

## Status (end of the first v3.4 pass)

Tickets 01 to 06 are committed on `main`. They were first reported done after tests and a dev sample only; the user then found real bugs in the app. The fixes below are committed too.

### Shipped beyond the ticket text

- **Frameless tables.** Every table (Data table, Tasks, GFM table, Calendar) has lines inside only: header top and bottom, row bottoms, cell rights. No outer border, no radius, no shaded header. The GFM table rules in `src/index.css` are scoped with `:not(.datatable *)` so they do not leak into the widgets.
- **Toolbar on hover.** The Data table's search, view options and New Record fade in when the table is hovered or focused (or a menu or search is open). New Record uses AFFiNE's button spec (radius 4, 1px border, padding 4×8, 14px/500).
- **Tasks table** uses the same grid as the Data table. It scrolls sideways below 30rem.
- **Kanban and Calendar can always be added.** A table without a Select or Date column gets a Status (Not started, In progress, Done) or Date column when the view is added.
- **Menu** follows AFFiNE's menu spec (padding 8, item padding 4, gap 4, weight 400, no border).
- **Read-only views** (version view, board doc card) show Tasks as a plain table and show callouts.
- **Slash menu** inserts Tasks and Data table in one step (`src/features/doc/insertSourceBlock.ts`), and keeps a paragraph after the block.
- **Board "add doc"** no longer white-screens (the embeddable element gets every style field).

### Causes worth remembering (each cost a bug report)

- **Crepe's CSS is in a low cascade layer** (`@layer crepe` in `src/index.css`). Its `.milkdown * { padding: 0; margin: 0 }` used to beat every Tailwind utility on the widgets drawn inside the editor. Only `code-mirror.css` stays unlayered, because it must beat CodeMirror's own injected theme.
- **Crepe's reset cancelled outlines**; moved to a lower layer it stopped, so `.milkdown :focus-visible { outline: none }` (unlayered) restores that. Without it, the whole editor gets a focus ring.
- **Source blocks are hidden three ways:** the `.tasks-source` / `.card-source` class (with `!important`, because Crepe's display rule has equal specificity), and an inline `style="display: none"` on the node decoration.
- **Tailwind v4 gates `hover:` behind `@media (hover: hover)`.** `@custom-variant hover (&:hover)` in `src/index.css` removes that, so hover reveals work on WebView2 touch and pen machines.
- **Tauri on Windows swallows HTML5 drag and drop** unless `dragDropEnabled` is false (`src-tauri/tauri.conf.json`). Kanban drag needs it. Changing it needs a rebuild or restart of the Tauri app.
- **Table text in a paragraph.** Before the single-step insert, a table could land as plain text in a neighbouring paragraph. Pages that already have such a paragraph keep it; it has to be deleted by hand.

## Not done yet

Open items, most important first.

1. **Verify in the real app (Tauri, restarted).** Nothing below has been seen by anyone in the running app, only in the dev pages (`/dev/ui`, `/dev/ui/affine`).
   - Kanban card drag between columns (needs `dragDropEnabled: false` live).
   - Table tools and row buttons appear on hover (with the plain `:hover` variant).
   - Calendar: click a day to add a record; the Calendar view itself was only checked in code and a dev sample.
   - Read-only Tasks and callouts in a board doc card and in the version view.
   - Slash menu: Data table and Tasks, at the end of a page and in the middle.
2. **Pages with a stray table paragraph.** No automatic repair. A repair (a paragraph that starts with `@schema {` and has a `|---|` row becomes a Data table again) needs a check against real files first: the line breaks may be gone in the saved Markdown, and a wrong repair would change data without telling anyone.
3. **Ticket 04 leftovers, to compare against AFFiNE:** code block header (language and copy), the floating toolbar when a card or embed is selected, drag handle alignment to the first line, callout details.
4. **Small spec gaps.**
   - The toolbar's icon buttons are 28px; AFFiNE's are 24px.
   - New Record shows both in the hover toolbar and in the bottom row. Check AFFiNE (the bottom row is "+ New Record" there too) before removing one.
   - Tasks has a 30rem minimum width; with a side panel open the delete button can scroll out of view. Consider a narrower layout.
   - Tools do not show in the Kanban and Calendar views (they sit in the same header, so check they behave the same).
5. **Reference page.** `/dev/ui/affine` does not draw avatar, toast, popover, skeleton, Kanban, Calendar or the cell types. Names only for those.
6. **Tests.** `insertSourceBlock` and the read-only Tasks table have no unit tests (they run on a live ProseMirror view). The ticket tests cover the pure model only.
7. **Housekeeping.** Commits are not pushed. `oxlint` still reports warnings in files this work did not touch.

## Process notes for the next pass

- Do not report a ticket done until it has been opened in a browser (a dev sample page is fine) and, for anything involving hover, drag or focus, checked with real input. The first pass skipped this and shipped five bugs.
- A dev sample hides differences that the real page has (extra plugins, the page head, read-only variants). Test the surfaces that render the same block: the doc page, the peek view, the version view, and the board doc card.
- Anything that depends on the Tauri window (drag and drop, native menus) cannot be checked in a browser. Say so in the ticket and ask for a check in the app.
