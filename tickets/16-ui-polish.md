# 16 — UI/UX polish

**Depends on:** 11, 20

## Goal
Give the app one calm, consistent look across every surface. This ticket changes look and UX only. It adds no features.

## Direction
- Notion-style: calm, text-first, warm grays.
- One muted blue accent. Use it only for focus rings, text selection, the active page in the sidebar, and primary buttons.
- Dense UI: tree rows about 28px, 13–14px text. Doc body text stays at 16px.
- Fonts: Geist and Geist Mono, bundled with `@fontsource-variable/geist` and `@fontsource-variable/geist-mono` (no CDN, so the app works offline). Board text keeps Excalidraw's own fonts.
- Motion: short transitions only (about 150 ms) on hover, tree expand/collapse, palette and dialogs. No decorative motion. Turn transitions off under `prefers-reduced-motion`.
- Light and dark themes both get the same care (ticket 11 wiring stays).
- Use `/impeccable` and `/ui-ux-pro-max` for the design work.

## Scope
1. Sidebar
   - Header: folder name, a search button (opens Ctrl+K), and a new-page button.
   - Tree chevrons use Lucide icons, aligned with the row icons.
   - Row actions show on hover: `+` (new child) and `⋯`. The `⋯` menu holds Rename for now (ticket 17 adds Delete).
   - Width 260px. `Ctrl+\` hides and shows the sidebar. The state is stored in `localStorage`. No drag-to-resize.
   - Keyboard: a visible focus ring, and Tab then Enter opens a page. Full arrow-key tree navigation is out of scope (Ctrl+K covers fast jumps).
2. Doc page
   - Geist everywhere, including Crepe headings (Crepe uses a serif by default).
   - Spacing and type scale tuned for reading.
   - Code blocks match the theme in light and dark.
   - The page title is still the file name. Make it clearly distinct from a `# Heading` in the content. Do not hide either one.
3. Board: the top bar, left toolbar, style bar and emoji picker share one visual system with the rest of the app.
4. Palette, Settings and dialogs (conflict and rename) share that system.
   - One menu style for every menu (sidebar `⋯` and `+`, palette, board menus), modeled on Notion's block menu:
     - a search field at the top (where the menu has more than a few items)
     - small muted group labels
     - rows: Lucide icon, label, and the shortcut right-aligned in a muted color
     - dividers between groups, a solid rounded panel with a soft shadow
   - Build it once as a shared component. Ticket 18 reuses it.
5. States
   - No folder open: a welcome empty state with an "Open folder" button.
   - No page selected: an empty state.
   - Loading: the tree, doc and board show calm loading states instead of a blank screen or "Loading scene...".

## Out of scope
- New features, except moving existing actions into the `⋯` menu.
- Drag-to-resize for the sidebar.
- Arrow-key navigation in the tree.

## Acceptance
- Screenshots in light and dark of the sidebar, doc, board, palette, Settings and each empty state.
- `/impeccable` critique or audit reports no high-severity issues.
- Text and UI contrast meets WCAG AA in both themes.
- `npm test`, `npm run build` and `npm run lint` are clean.
