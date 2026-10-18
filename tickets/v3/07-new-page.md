# v3-07 — New page experience

**Depends on:** —

## Goal
Creating and starting a page feels light, like AFFiNE: one click to a new page, a clean header, and a real icon picker.

## Scope
- **New page:** New doc creates `Untitled.md` at once (`Untitled 2.md` and so on if taken), opens it, and focuses the title. The title shows the placeholder "Title". Enter or blur renames the file, as the title does today. New board works the same with `Untitled.excalidraw`. The sidebar name input for new pages goes away.
- **Add icon:** a page with no icon shows a small "Add icon" link above the title (on hover, and always while the doc is empty), not the big empty box. A page with an icon shows it large. Clicking either opens the icon picker. Docs and boards.
- **Icon picker:** a popover with **Emoji** and **Icons** tabs, and **Remove**.
  - Emoji: search, recently used, categories. System emoji. Use an emoji picker library that works offline (no CDN fetch at runtime). The implementer picks it.
  - Icons: Lucide icons (already a dependency), with search and a color choice. Load icons lazily so the bundle does not grow with the whole set.
  - Colors: a fixed palette of about 8, stored by name and mapped to light and dark theme values.
- **Storage:**
  - emoji, as today: `icon: 🐳`
  - Lucide: `icon: lucide:rocket` and `iconColor: blue` in doc front matter
  - boards: top-level `"icon"` and `"iconColor"` in the `.excalidraw` JSON
  - Old files keep working unchanged.
- Every place that shows a page icon renders both kinds: sidebar, Ctrl+K, and the page header. Later tickets (All pages, Favorites, backlinks) use the same icon component.
- **Info box:** Created and Tags move into a collapsible **Info** box under the title. The collapsed state is one `localStorage` value for all pages. The default is collapsed.
- New UI: design it with `/impeccable` and `/ui-ux-pro-max`, borrowing the AFFiNE layout from the spec, not its colors or fonts.

## Out of scope
- The Start row (ticket 11). Custom icon uploads. 3D emoji images.

## Tests
- Front matter: read and write `icon` (emoji and `lucide:` form) and `iconColor`, keeping other keys intact. Remove clears both.
- `Untitled` name picking when `Untitled.md` and `Untitled 2.md` exist.

## Acceptance
- New doc: `Untitled.md` opens with the cursor in the title. Type a name and press Enter: the file is renamed.
- Pick an emoji: the front matter has it and the sidebar shows it. Pick a blue Lucide icon: the sidebar shows it in blue, in light and dark themes. Remove: both keys are gone.
- The same picker works on a board, and the `.excalidraw` holds `icon` and `iconColor`.
- The picker works with the network off.
- The Info box starts collapsed. Expanding it on one page keeps it expanded on the next.
