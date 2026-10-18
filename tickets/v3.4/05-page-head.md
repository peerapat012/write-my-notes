# v3.4-05 — Page head

**Depends on:** —

## Goal
The top of the editor zone has a large title, "Add icon", and an Info (properties) row, like AFFiNE.

## Scope
- Large editable title above the body (the page name; renaming goes through the existing rename-and-links flow, not a raw edit).
- "Add icon" on hover above the title, opens the existing icon picker; once set it shows the icon.
- Info row: collapsible, shows the page properties that already exist (ticket 19 "Page properties"): created, updated, tags if any. The collapsed state is remembered per session.
- Stays out of the saved body: title and properties live where they live today (file name, frontmatter).

## Out of scope
- New property types. Page covers.

## Tests
- Pure helpers only (for example title to file name). The rest is acceptance.

## Acceptance
- New page: empty large title with a placeholder, "Add icon" on hover, Info collapsed.
- Rename via the title renames the file and rewrites links (same as the sidebar rename).
- Light and dark.
