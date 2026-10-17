# Tickets

One ticket per `/implement` session. Do them in order unless "Depends on" says otherwise. Spec: [../SPEC.md](../SPEC.md).

When a ticket is done, its tests pass, and its acceptance checks pass:

1. Commit to `main` with the message `ticket NN: <title>`.
2. Push to `origin` (https://github.com/peerapat012/write-my-notes).
3. Make one commit per ticket.
4. Never commit `.env.local`.

| # | Ticket | Depends on |
|---|--------|------------|
| 01 | [Scaffold](01-scaffold.md) | — |
| 02 | [Open folder + page tree](02-folder-and-page-tree.md) | 01 |
| 03 | [Doc editor + autosave](03-doc-editor.md) | 02 |
| 04 | [Images in docs](04-doc-images.md) | 03 |
| 05 | [Board base + custom UI](05-board-base.md) | 02 |
| 06 | [Board tools: sticky, emoji, image](06-board-tools.md) | 05 |
| 07 | [External change detection](07-external-changes.md) | 03, 05 |
| 08 | [Rename/move + link rewrite](08-rename-and-links.md) | 02 |
| 09 | [Doc ↔ board links](09-doc-board-links.md) | 04, 06, 08 |
| 10 | [Ctrl+K search](10-search.md) | 03 |
| 11 | [Theme + settings](11-theme-settings.md) | 02 |
| 12 | [AI: client + edit selected](12-ai-edit-selected.md) | 06, 11 |
| 13 | [AI: generate sticky / flow / outline](13-ai-generate.md) | 12 |
| 14 | [AI: summarize board to doc](14-ai-summarize.md) | 12, 03 |
| 15 | [Export PNG/SVG](15-export.md) | 05 |
| 16 | [UI/UX polish](16-ui-polish.md) | 11, 20 |
| 17 | [Delete page](17-delete-page.md) | 08, 16 |
| 18 | [Block action menu](18-block-menu.md) | 16 |
| 19 | [Page properties (created, tags)](19-page-properties.md) | 10, 16 |
| 20 | [Organize `src/` by feature](20-src-structure.md) (do before 16) | 11 |
