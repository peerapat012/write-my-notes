# v3.4-04 — Block chrome

**Depends on:** —

## Goal
The block handle, slash menu, floating toolbar, headings, callout and code block match the spec table.

## Scope
Files: `src/index.css`, `src/features/doc/DocPage.tsx`, `src/features/doc/LinkToolbar.tsx`.
- Headings and body: H1 28/700 … H6 18, body 15, line height `1em + 8px`, spacing from the spec table. Change the existing type tokens; keep their names.
- Slash menu: width 280, padding 8/4/8/8, radius 8, max height 390, group labels 12/500, each item has a 28×28 icon tile with a 1px border.
- Block handle: `+` and grip aligned to the first line of the block, hover fill, same sizes as AFFiNE.
- Floating toolbar for a selected card or embed: height 36, gap 8, buttons Open, Copy, Edit, view switch (Link / Card), More. Reuse `LinkToolbar` and `LinkCard`; extend, do not rebuild.
- Callout block: add it to the slash menu (`/` → Callout). Padding 5×10, radius 8, emoji box 24, margin 8×0, emoji click opens the existing icon picker. Stored as a blockquote that starts with an emoji and a `[!callout]` marker line; plain Markdown viewers show a quote.
- Code block: header with language and copy, as AFFiNE.

## Out of scope
- Edgeless mode. New block types other than Callout.

## Tests
- Parse and serialize the Callout marker: round trip, a quote without a marker stays a quote, a missing emoji falls back to a default.

## Acceptance
- Side by side with the AFFiNE reference, the slash menu, handle, toolbar, headings and callout match in size and spacing.
- A callout saved and reopened is the same; a plain quote is not turned into a callout.
- Light and dark.
