# Tickets — v3

One ticket per `/implement` session. Do them in order unless "Depends on" says otherwise. Spec: [../../SPEC-v3.md](../../SPEC-v3.md), on top of [../../SPEC-v2.md](../../SPEC-v2.md) and [../../SPEC.md](../../SPEC.md).

When a ticket is done, its tests pass, and its acceptance checks pass:

1. Commit to `main` with the message `ticket v3-NN: <title>`.
2. Push to `origin` (https://github.com/peerapat012/write-my-notes).
3. Make one commit per ticket.
4. Never commit `.env.local`.

### v3 — History and git

| # | Ticket | Depends on |
|---|--------|------------|
| 01 | [Right panel + Outline](01-right-panel-outline.md) | — |
| 02 | [Trash](02-trash.md) | — |
| 03 | [Git allowlist + modes + Save version](03-git-modes-save-version.md) | — |
| 04 | [Page history](04-page-history.md) | 01, 03 |
| 05 | [Commit graph](05-commit-graph.md) | 04 |
| 06 | [Setup wizard](06-setup-wizard.md) | 03, 04 |

### v3.1 — Notes

| # | Ticket | Depends on |
|---|--------|------------|
| 07 | [New page experience](07-new-page.md) | — |
| 08 | [All pages](08-all-pages.md) | 02 |
| 09 | [Favorites](09-favorites.md) | 02, 08 |
| 10 | [Task block](10-task-block.md) | — |
| 11 | [Templates](11-templates.md) | 07, 10 |
| 12 | [Daily note](12-daily-note.md) | 11 |
| 13 | [Print to PDF](13-print-pdf.md) | — |
| 14 | [Backlinks](14-backlinks.md) | — |

### v3.2 — AI and docs on boards

| # | Ticket | Depends on |
|---|--------|------------|
| 15 | [Doc card on boards](15-doc-card.md) | 02 |
| 16 | [AI from docs on boards](16-ai-from-docs.md) | 15 |
| 17 | [AI chat](17-ai-chat.md) | 01, 04 |

Tickets 01–03 do not depend on each other. Tickets 07, 10, 13 and 14 do not depend on v3 and can go any time.

"Ticket NN" means a v3 ticket. "v1 ticket NN" means a ticket in [../](../README.md).

## UI direction

Borrow from AFFiNE where a ticket adds UI. Do not redesign what exists.

- Sidebar, top to bottom: Search, All pages (08), Today (12), Settings / Favorites (09) / page tree / Others: Trash (02), Templates (11).
- The right panel toggle sits at the top right of the page header. Panel tabs sit at the top of the panel (01, 04, 17).
- Keep layout and structure ideas only. Do not copy AFFiNE colors, fonts or branding.
