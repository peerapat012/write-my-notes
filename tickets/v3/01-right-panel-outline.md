# v3-01 — Right panel + Outline

**Depends on:** —

## Goal
Jump around a long doc from an outline in a right-side panel. The panel also gets the History tab in ticket 04.

## Scope
- A right panel with tabs. This ticket adds the **Outline** tab only. Leave room for **History** (ticket 04).
- A toggle button at the top right of the page opens and closes the panel.
  - The state is stored in `localStorage`. The default is closed.
  - When no tab has anything to show (for example a board in this ticket), hide the toggle.
- Outline (docs, web and desktop):
  - lists headings H1–H6, indented by level, and nothing else
  - clicking a heading scrolls the doc to it
  - the heading of the section in view is highlighted while scrolling
  - updates as the doc changes
- New UI: design it with `/impeccable` and `/ui-ux-pro-max`, and match the v1 ticket 16 look.

## Out of scope
- History tab (ticket 04). Outline for boards.

## Tests
- Headings from markdown with their levels, ignoring `#` lines inside fenced code blocks.

## Acceptance
- A doc with H1, H2 and H3 headings shows them indented. Clicking one scrolls to it.
- Scrolling the doc moves the highlight.
- Adding a heading updates the outline without reopening the page.
- Closing the panel and reloading keeps it closed.
- A board shows no toggle.
- Looks right in light and dark themes, web and desktop.
