# Tickets — v2

One ticket per `/implement` session. Do them in order unless "Depends on" says otherwise. Spec: [../../SPEC-v2.md](../../SPEC-v2.md), on top of [../../SPEC.md](../../SPEC.md).

When a ticket is done, its tests pass, and its acceptance checks pass:

1. Commit to `main` with the message `ticket v2-NN: <title>`.
2. Push to `origin` (https://github.com/peerapat012/write-my-notes).
3. Make one commit per ticket.
4. Never commit `.env.local`.

| # | Ticket | Depends on |
|---|--------|------------|
| 01 | [Vault storage seam](01-vault-seam.md) | — |
| 02 | [BYOK Gemini key](02-byok.md) | — |
| 03 | [Deploy web build to GitHub Pages](03-pages-deploy.md) | 02 |
| 04 | [Mermaid in docs](04-mermaid.md) | — |
| 05 | [AI in docs (`/ai`)](05-ai-in-docs.md) | 02 |
| 06 | [Board text in search](06-board-search.md) | — |
| 07 | [Tauri wrapper + `tauriFs`](07-tauri-wrapper.md) | 01 |
| 08 | [Git status + commit](08-git-status-commit.md) | 07 |
| 09 | [Git pull + push](09-git-pull-push.md) | 08 |
| 10 | [Windows release CI](10-windows-release.md) | 07 |

Tickets 04–06 do not depend on 07–10. The two groups can go in either order.
