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
3. The Data table has no row dividers or a visible grid, empty rows are collapsed to a few pixels, and the title column has a bare "T" glyph with no label. Column headers have no clear surface or hover. AFFiNE shows a bordered grid, 34px rows and header, type icons, and a bottom row with "+ New Record" and column stats.
4. There are no view tabs in the Data table header (AFFiNE: Table, Kanban, Calendar).
5. The block handle shows `+` and a grip, but there is no block-selected floating toolbar for cards and embeds (AFFiNE: Open, copy, edit, Card view, ... menu).
6. The page has no large title, no "Add icon" and no Info (properties) row inside the editor zone.

## Goals

- The Data table reads like AFFiNE's Table view: a bordered grid, fixed row and header height, type icons, typed cells, a stats row.
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
