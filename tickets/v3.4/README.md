# Tickets — v3.4 (editor zone)

One ticket per `/implement` session. Do them in order unless "Depends on" says otherwise. Spec: [../../SPEC-v3.4.md](../../SPEC-v3.4.md), on top of [../../SPEC-v3.3.md](../../SPEC-v3.3.md) and the earlier specs.

When a ticket is done, its tests pass, and its acceptance checks pass:

1. Commit to `main` with the message `ticket v3.4-NN: <title>`.
2. Make one commit per ticket.
3. Never commit `.env.local`.

For UI work, use `/impeccable` and `/ui-ux-pro-max`. Check light and dark. The AFFiNE reference is `/dev/ui/affine`.

| # | Ticket | Depends on |
|---|--------|------------|
| 01 | [Hide source blocks](01-hide-source-blocks.md) | — |
| 02 | [Data table grid](02-data-table-grid.md) | — |
| 03 | [Cell renderers](03-cell-renderers.md) | 02 |
| 04 | [Block chrome](04-block-chrome.md) | — |
| 05 | [Page head](05-page-head.md) | — |
| 06 | [Views bar: Kanban and Calendar](06-views-bar.md) | 02, 03 |
