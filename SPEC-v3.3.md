# write-my-notes — v3.3 spec: UI refresh, styled dropdowns, Data table, peek view, link cards

v3.3 has two parts.

- **UI refresh:** the app keeps its look (warm grays, one blue accent, Geist, Lucide) but gets the finish and the app chrome of Notion and AFFiNE: a page top bar with a breadcrumb, a richer sidebar, better content typography, toasts and dialogs instead of browser alerts, a start page, and a better Ctrl+K. See "UI refresh".
- **Notes features:** a database-style table in docs like the Table View in AFFiNE, a peek view (a page opened in a modal), `@` links that show as a text link or a preview card, and one styled dropdown that replaces the browser's native ones.

The UI refresh ships first. It does not depend on the notes features, and the notes features build on its dropdown, toast and top bar.

Everything in [SPEC.md](SPEC.md), [SPEC-v2.md](SPEC-v2.md) and [SPEC-v3.md](SPEC-v3.md) still holds unless this file says otherwise. This file lifts one v3 non-goal ("column types in tables") for the new **Data table** block only. The GFM **Table** from the `/` menu and the **Tasks** block stay as they are. Click behavior of page links changes where noted under Peek view.

Reference: three AFFiNE screenshots from the request (the Table View, its column menu with the "Property type" submenu, and a doc opened in a peek modal that also shows a preview card). "Like the picture" means the same structure and interactions. It does not mean AFFiNE's colors, fonts or branding.

## Goals

- The app feels like a finished product next to Notion and AFFiNE, with the same palette and font.
- Every dropdown in the app looks like the app, in light and dark themes. No native `<select>` popups.
- A doc can hold a table with typed columns. The user adds, removes, renames, moves and duplicates columns, and picks each column's type.
- A cell or a line of text can link to another page by typing `@`. In the body, the link can show as a text link or as a preview card.
- A linked page opens in a peek modal, without leaving the current page.
- The data stays a plain file: readable in git diffs and in other editors, found by Ctrl+K, rewritten on rename and move, counted by backlinks.

## Non-goals (v3.3)

- Kanban and Calendar views. Only the Table view. Their tabs are not drawn.
- Filter and hide column. Their toolbar icons and menu items are not drawn.
- Column resize, grouping, formulas, merged cells, drag-to-reorder rows (use the row menu).
- Column types Progress, Created time, Attachment, Member, Relation, Rollup.
- Rows as pages. CSV import and export.
- Editing the Data table in the read-only version view or on a board's doc card (it renders, it does not edit).
- Replacing or migrating the Tasks block.
- Peek view buttons for "open in new tab" and "split view" (there are no page tabs in this app).
- A new visual identity. The UI refresh keeps the palette, the font and the icon set (the v3 "full UI redesign" non-goal still holds). Page covers, workspace switching UI beyond the existing "Open another folder", real-time collaboration UI (avatars, presence), a new font.

## UI refresh

Problem: the app works but looks plain next to Notion and AFFiNE. The structure is close. What is missing is the app chrome (a top bar, a breadcrumb, quiet status and actions), the finish on the sidebar and the content, feedback (toasts, dialogs, motion) and a start page.

Rules for the whole refresh:

- Keep the identity: warm grays, one blue accent, Geist and Geist Mono, Lucide icons, light and dark themes. Add what is missing. Do not swap the palette, the font or the icon set.
- No change to what the app does. Existing shortcuts, storage formats and flows stay.
- Tokens first: new spacing, radius, shadow, motion and type values are named in `src/index.css` (and recorded in `DESIGN.md` through `/impeccable document`), then used everywhere. No one-off values in components.
- Contrast: body and placeholder text at least 4.5:1, icons at least 3:1, in both themes. Visible keyboard focus everywhere. `prefers-reduced-motion` keeps state changes visible without movement.
- Design it with `/impeccable` and `/ui-ux-pro-max`, and review each ticket in light and dark themes.

### Page top bar

A slim bar (40 px) above the page in the main area, for docs and boards. It replaces the floating right-panel toggle.

- **Left:** a **breadcrumb**: the page's folder path, then the page (icon and name). A folder segment opens that folder's page when there is one, and does nothing otherwise. A long path collapses its middle to `…`, with the full path in a menu.
- **Right, in this order:**
  - a muted status: **Saving…**, **Saved**, or "Edited <relative time>" (for example "Edited 2 min ago") from the file's last change
  - a **star** (favorite on and off; filled when on)
  - a **…** page menu: Save as template (docs), Print / Save as PDF (docs), Copy link, Delete (to Trash). Same actions as the sidebar row menu.
  - the **right panel** toggle (moved here from the floating button)
- The title and icon stay in the page header as they are now (v3 ticket 07). On the desktop the bar sits under the custom title bar.
- The version view, the peek view, Trash, All pages and the history page show a title in place of the breadcrumb.

### Sidebar

- **Workspace header:** the folder's initial in a rounded square (color from a hash of the name), the folder name, and a chevron that opens a menu: Open another folder, Settings. Search, New page and Hide stay at the right.
- **Rows:** 32 px high, 8 px radius, the page icon (or the default page-type icon) at 18 px, the name, and on hover a **⋯** menu and a **+** button. The active page has the soft accent background. The pressed and drag-over states are visible.
- **Sections** with a small header and a chevron, collapsible, remembered in `localStorage`: **Favorites** and **Pages** (the tree). The quick links Search, Today and All pages stay above them as rows with icons. Trash and Settings sit at the bottom as quiet rows.
- **Resizable:** drag the right edge to change the width (220 to 400 px, default 260). Double-click the edge to reset it. The width is remembered. Hiding the sidebar slides it out (see Feedback and motion).
- No count badges, except the changed-files count in the git row.
- Git footer: one compact row (status text and the Save version button) with Pull and Push as icon buttons, as today but with the new spacing.

### Content (doc body)

- **Type scale** (tokens): body 16 px with 1.65 line height. H1 32, H2 24 and H3 20 px, with tighter tracking and weight 600 to 700. More space above a heading than below it (about 1.6 : 1). The page title stays at 40 px.
- **Measure:** the body column stays near 720 px (`max-w-3xl`) with 40 px side padding on narrow windows. The page top padding drops to 32 px now that the top bar exists.
- **Blocks:** paragraph spacing 0.6 em, list items 4 px apart. A quote gets a tinted background and an 8 px radius (no colored side border). Code blocks and inline code sit on the `50` surface with an 8 px radius. Images have an 8 px radius. A horizontal rule is a 1 px line with generous space. GFM tables and the Tasks block get a 1 px border, a muted header row and a row hover.
- **Crepe chrome** (block handle, slash menu, toolbar, link tooltip) takes the same panel look as `Menu`: same radius, border, shadow, row height and hover color, in both themes.
- Selection and caret stay themed from the accent.

### Feedback and motion

- **Toasts:** a small stack at the bottom right replaces every `alert()`. A toast is one line with an icon (info, success, error) and an optional action (for example **Undo**). It closes itself after 5 seconds; an error stays until closed. Hover pauses the timer.
- **Confirm dialogs:** every `confirm()` and destructive question uses the app's `Dialog` (title, one sentence, a danger or primary button, Cancel). Template replace, delete column and empty trash all use it.
- **Motion tokens:** 150 ms for hover and focus, 200 ms for panels and menus, with an exponential ease-out. Used for: the sidebar and the right panel sliding in and out, menus and popovers fading in and moving 4 px, dialogs scaling from 0.98, new rows fading in, page content fading in when it loads. Nothing loops except loading indicators.
- **Loading and error states** use skeletons and inline messages with a recovery action, not bare text.

### Start page

The "No page open" screen becomes a start page:

- The folder name as the heading, and a row of **quick actions**: New doc, New board, Today, New from template.
- **Recent** pages: the last 6 by last change, each a row with the icon, title, folder and relative time. The list comes from the same entries as All pages.
- **Favorites** as a second list when there are any.
- With no folder open: the existing "Open your notes folder" state, with the same button styles.

### Ctrl+K palette

- With an empty query it shows **Recent** pages and **Actions** (New doc, New board, Today, All pages, Toggle theme, Settings, Open another folder), each action with its shortcut when it has one.
- With a query it shows page matches first, then matching actions. Today's search behavior and the snippet line stay.
- Same panel look as `Menu`. Group labels are small and muted.

### Settings dialog

- A wider dialog (640 px) with a left list of sections, **Appearance** (theme), **AI** (model, key) and **Git** (mode; desktop only), and the selected section at the right. Every change still applies and saves at once. On narrow windows the list becomes a row of tabs.

### Acceptance (UI refresh)

- Open a doc: a top bar shows the breadcrumb, a save status, a star, the **…** menu and the panel toggle. The floating toggle is gone. Edit text: the status shows Saving…, then Saved.
- The sidebar has a workspace header, collapsible Favorites and Pages sections, 32 px rows with hover actions and a resize handle. The width survives a restart.
- Body text is 16 px with the new heading scale. Quotes, code, images and tables use the new styles. The slash menu and the toolbar look like the app's menus. Light and dark themes both look right.
- No `alert()` or `confirm()` is left (a grep confirms). Errors show as toasts, destructive questions as dialogs.
- Closing the sidebar or the right panel animates. With reduced motion it does not move.
- With no page open, the start page shows quick actions and recent pages. Ctrl+K with nothing typed shows recent pages and actions.
- Settings opens with sections.
- Contrast, focus rings and keyboard use pass in both themes.

## Dropdown menu

Reference: the AFFiNE column menu and its "Property type" submenu: a floating panel, one row per option with a small icon on the left, the label, a check mark on the right for the current value, and a submenu that opens to the side.

- One component, built on the existing `Menu` (`src/components/Menu.tsx`). It adds:
  - a **check mark** for the selected item
  - a **submenu**: an item with `children` opens a second panel to the right (to the left when there is no room), on hover or on Right arrow
  - a **trigger** form for "pick a value" fields: a button that shows the current value and opens the menu below it
- Replaces every native `<select>`:
  - Tasks block: Status (a colored pill that opens the menu)
  - AI chat: "Apply changes" (Approve / Auto)
  - Any other `<select>` found in the app. The ticket confirms with a grep that none are left.
- Keyboard: Arrow keys move, Enter picks, Esc closes and returns focus to the trigger, Right opens a submenu, Left closes it.
- It works from the plain-DOM widgets, or those widgets move to React (see Rendering).

## Data table

### Layout (like the picture)

From top to bottom:

1. **Title row:** the table's title (default "Untitled", editable) and a **…** menu (Delete table).
2. **Tab and toolbar row:** one tab, **Table View**, with its icon. At the right: **Search** (an icon that opens a field that filters rows by text), a **…** menu, and a **+ New Record** button.
3. **Header row:** each column shows its type icon and name. The first column is **Title**. A **+** at the right end adds a column. Clicking a header opens the column menu.
4. **Rows:** a thin separator between rows and between columns. A row handle at the far left appears on hover. On hover the Title cell shows two small buttons at its right: **Expand record** and **⋯** (the row menu).
5. **New Record row:** a **+ New Record** line under the last row.
6. **Summary row:** under each column a muted "Calculate" slot. It shows the chosen statistic, for example "EMPTY 33.33%". Clicking it opens a dropdown.
7. A **horizontal scrollbar** when the columns are wider than the page.

Select values are colored pills (for example "in-progress"). Checkbox cells show a checkbox. The first column also shows its type icon (text) before each value. Light and dark themes both work.

### Block

- `/` → **Data table** inserts a block with a Title column, two more columns (Text), and two empty rows.
- The first column is **Title**: text, always first, cannot be deleted, moved or retyped.
- New columns are named "Column", "Column 2" and so on, type Text.

### Column menu

Clicking a column header opens a menu like the second screenshot:

- A name field with the type icon beside it. Enter or blur renames.
- **Type** (submenu, current type checked): Text, Number, Select, Multi-select, Checkbox, Date, Link, Page.
- **Sort ascending**, **Sort descending** (see Search, sort and summary).
- **Insert left**, **Insert right**, **Move left**, **Move right** (disabled at the ends and next to Title; disabled while a sort is active).
- **Duplicate** (copies the cells too), **Delete** (no question when the column is empty, otherwise a confirm dialog).
- For Select and Multi-select: **Options** (rename, recolor, remove).

### Row menu and Expand record

- **⋯** (and the row handle) open: **Expand record**, **Insert above**, **Insert below**, **Duplicate**, **Delete**. Insert is disabled while a sort is active.
- **Expand record** opens the row in a peek modal (see Peek view): the row's title as the heading, then one line per column with its type icon, name and editable value. Edits write to the table.

### Cells and types

| Type | Shown as | Edited with | Stored as |
|---|---|---|---|
| Text | text; `@` makes page chips | text input | text; page links as `[Title](path.md)` |
| Number | right-aligned number | number input | the number as typed |
| Select | one colored pill | dropdown menu; "Create «x»" when the typed name is new | the option name |
| Multi-select | several pills | dropdown menu with check marks | names joined by `, ` |
| Checkbox | a checkbox | click | `[x]` or `[ ]` |
| Date | locale date | native date input, styled | `YYYY-MM-DD` |
| Link | URL, opens in the browser | text input | the URL |
| Page | page chips with their icon | the `@` page picker, several allowed | `[Title](path.md)` joined by `, ` |

- Select options have a name and a color from the icon palette (8 names, light and dark values). A new option takes the next unused color. Options are created inline from a cell and edited from the column menu.
- Changing a column's type keeps the cell text. A value that does not fit the new type (for example "abc" in a Number column) shows as-is with a muted warning mark; nothing is deleted.
- Option names cannot contain `,` or `|`.

### Search, sort and summary

- **Search** filters the visible rows by text in any cell. It is not saved.
- **Sort** (ascending or descending by one column) changes only the order rows are shown in, not the order in the file. It is saved in the schema. A header shows an arrow on the sorted column, and clicking the same menu item again, or the toolbar **…** → "Clear sort", removes it.
- **Summary** per column, saved in the schema. Every type: None, Count all, Count empty, Count filled, % empty, % filled. Number columns also: Sum, Average, Min, Max. Checkbox: Count checked, % checked.

### Keyboard

- Arrow keys move between cells. Enter edits the cell, Esc stops editing. Tab and Shift+Tab move to the next and previous cell. A Tab in the last cell adds a row.

### Print

- The table prints. The controls (tab row, toolbar, handles, row buttons, **+** buttons, summary slots that show "Calculate") are hidden in print CSS.

## Linking a page with `@`

- Typing `@` in a doc body, or in a Title or Text cell, opens a page picker under the cursor: docs and boards, filtered as the user types, same list and icons as the AI chat's `@`.
- Picking a page inserts a **link**. In the file it is a normal Markdown link, relative to the doc, for example `[Plan](../Plan.md)`.
- Because it is a Markdown link: rename and move rewrite it (v1 ticket 08), backlinks list the doc (v3 ticket 14), Ctrl+K finds the title text.

### Link view: text or card

- In the **doc body**, a link made with `@` can show as:
  - **Text link:** the page icon and title, inline in the sentence (the default).
  - **Preview card:** a block under the text, like the third screenshot: the page icon and title, a short preview (the first lines of the doc; "Preview of the doc will be displayed here." when it is empty), and "Updated <date and time>" from the file's last change. Boards show their title and "Board". A missing target shows the v1 broken-link state.
- Hovering or selecting a page link shows a small toolbar: **Text** / **Card** switch, **Open** (peek), **Open page**, **Remove link**.
- Storage: a card is a paragraph that holds only the link, with the Markdown link title `card`: `[Plan](../Plan.md "card")`. Any other editor shows it as a normal link. A text link has no title.
- In **table cells** the view is always the text link (a chip with the icon). Cards are for the body only.
- The card updates when the target page is saved, and on the focus check (same source as the doc card on boards).

## Peek view

A page opens in a centered modal over the current page, like the third screenshot. The current page and its scroll position stay behind a dimmed backdrop.

- **Opens from:** clicking a page link, a chip or a preview card in a doc or table; **Expand record** on a table row; a page link inside a doc card on a board.
- **Content:** a doc opens fully editable (the doc page, with its title, icon, Info and body). A board opens in view mode. A table record opens as the record form.
- **Buttons** in a vertical stack outside the modal's top right edge, each with a tooltip: **Close**, **Open page** (closes the peek and goes to the page), **Copy link** (the page path as a Markdown link), **Info** (a popover with created, updated and tags).
- **Close with** Esc, the Close button, or a click on the backdrop. Focus returns to the element that opened it. Edits inside are saved as usual (autosave); closing the peek flushes pending saves.
- A peek can open another peek from a link inside it (the new one replaces the old one; Close goes back to the page behind).
- **Modifier:** Ctrl/Cmd+click on a link opens the page full screen instead of the peek (v1 behavior).
- Size: up to 960 px wide and 90% of the window height; full width with small margins on narrow windows. Light and dark themes.
- Right panel and sidebar stay usable only after the peek is closed (the peek is modal).

## Storage of the Data table

The block is a fenced code block with language `datatable`, like the Tasks block. The first line holds the schema as one line of JSON, then a GFM table.

````
```datatable
@schema {"title":"Sprint","types":["select","date","checkbox","page"],"options":{"1":[{"n":"Not started","c":"gray"},{"n":"Done","c":"green"}]},"sort":{"col":2,"dir":"asc"},"summary":{"1":"empty%"}}
| Title | Status | Due | Done | Related |
|---|---|---|---|---|
| Write the spec | Done | 2026-10-20 | [x] | [Plan](../Plan.md) |
| Review | Not started |  | [ ] |  |
```
````

- `types` has one entry per column after Title, in order (so the first entry is column 1). `options` is keyed by the column's position and only exists for Select and Multi-select columns. `sort` and `summary` are optional.
- A cell's `|` is written `\|`. Line breaks in a cell become a space.
- A missing or broken `@schema` line makes every column Text. The table is still shown, and the next edit writes a schema.
- Every edit rewrites only this block's text. Nothing is stored outside the `.md`.
- An unknown type name is treated as Text and kept as written until the column is retyped.

## Rendering

- Crepe's code block preview is sanitized HTML, so it cannot hold controls. The Tasks block already solves this with a ProseMirror widget (`src/features/doc/tasksView.ts`): the code block stays in the document and is hidden, the widget edits its text.
- The Data table uses the same widget approach but renders with **React** (`createRoot` into the widget's DOM node), so it can reuse `Menu`, `PageIcon`, the page picker and the peek view. The widget keys on the block text so typing in a cell does not rebuild it.
- The preview card uses a ProseMirror decoration the same way: a paragraph that holds only a link with title `card` is hidden, and a card widget is drawn in its place.
- The peek view is one React component mounted at the app level (next to the other dialogs). It reuses `DocPage` for a doc.
- Edits are committed on blur, Enter, or a menu pick, not on every keystroke, so focus is not lost.

## Tests (Vitest, pure logic)

- Parse and serialize the `datatable` block: round trip, schema line, `\|` escapes, empty cells, missing or broken schema (all Text), unknown type, sort and summary.
- Column operations: add, rename, insert left/right, move, duplicate, delete, change type (text kept, nothing lost).
- Row operations: add, insert above/below, duplicate, delete.
- Select options: a new name becomes an option with the next color; rename and remove update the cells.
- Cell values: checkbox `[x]`/`[ ]`, date, number validity, multi-select join and split.
- Sort order (text, number, date, empty last) and the summary statistics (empty %, sum, average).
- Page links in cells and body: link text and path out, relative paths from nested folders; rename rewrites a link inside the block; backlinks see it.
- Card link detection: a paragraph with only a link titled `card` is a card; the same link inside a sentence is not.

## Acceptance

- `/` → Data table inserts a table that looks like the picture: title row, Table View tab, toolbar, typed header icons, New Record row, summary row. Add 2 columns of different types, fill 3 rows, reopen the doc: the same table. The `.md` holds the fenced block.
- Open a column menu: rename, change type (current one checked), sort, insert left and right, move, duplicate, delete all work.
- A Select cell opens a styled dropdown, not the browser's. Creating a new option from a cell adds it to the column.
- Search narrows the rows. Sorting changes the shown order and survives a reopen. A summary slot shows "EMPTY 33.33%" for 1 empty of 3.
- Expand record opens a peek with the row's fields; editing a field updates the table.
- Type `@` in a doc body, pick a doc: a text link shows. Switch it to Card: a preview card shows with the title, a preview and the updated time. The `.md` holds `[Title](path.md "card")`. Rename the doc in the app: the link still works and the `.md` holds the new path. The doc shows under "Linked from" on the target.
- Click a page link, chip or card: a peek modal opens with Close, Open page, Copy link and Info. Edit the doc inside it, press Esc: the edit is saved. Ctrl+click opens the page full screen.
- The Tasks status and the chat's "Apply changes" use the same styled dropdown. No native `<select>` is left.
- Light and dark themes both look right. Print shows the table without controls. Ctrl+K finds text in a cell.

## UI design

Design it with `/impeccable` and `/ui-ux-pro-max`. Borrow the structure from AFFiNE's Table View, column menu, peek modal and link card (see Reference). Do not copy its colors, fonts or branding. Match the existing look: warm grays, one accent, the Lucide icon set, 150 ms transitions, no new dependency unless a ticket finds a small one worth it.

## Tickets

UI refresh (ships first):

1. **Tokens and type scale:** spacing, radius, shadow, motion and type tokens in `index.css`; record them in `DESIGN.md` with `/impeccable document`.
2. **Content styling:** the doc body scale and block styles; Crepe chrome (block handle, slash menu, toolbar, link tooltip) on the `Menu` look.
3. **Page top bar:** breadcrumb, save status, star, page menu, panel toggle; remove the floating toggle.
4. **Sidebar:** workspace header, sections, rows, resize.
5. **Toasts and dialogs:** the toast stack; replace every `alert()` and `confirm()`; motion for panels, menus and dialogs.
6. **Start page and Ctrl+K:** the start page, recent pages, quick actions, palette actions.
7. **Settings sections.**

Notes features:

8. **Dropdown menu:** check mark, submenu, trigger form; replace every native `<select>`.
9. **Data table model:** parse and serialize, column and row operations, cell values, sort, summary, tests.
10. **Data table block:** the React widget, the `/` item, the layout from the picture, cell editors for all types, column and row menus, keyboard.
11. **Search, sort and summary** in the table UI.
12. **Peek view:** the modal, its buttons, opening from links; Expand record.
13. **Page links with `@`:** the picker in body and cells, the Page column type, chips, broken links.
14. **Link view:** text or card, the toolbar, the `"card"` title, the card widget.
15. **Print and read-only:** print CSS, version view, doc card.
