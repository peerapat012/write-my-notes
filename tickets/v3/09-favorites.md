# v3-09 — Favorites

**Depends on:** 02, 08

## Goal
Keep the pages you use most one click away.

## Scope
- A star in each page's menu and in the All pages star column adds or removes a favorite.
- A **Favorites** section at the top of the sidebar, in the order added. Hidden when empty.
- Stored in `localStorage`, keyed per notes folder (path on desktop, folder name on web).
- Rename and move update the stored path. Moving a page to Trash removes it.
- Web and desktop.

## Out of scope
- Syncing favorites between devices. Reordering favorites.

## Tests
- Path update on rename and move, including a page inside a moved parent. Removal on Trash.

## Acceptance
- Star a page: it shows under Favorites. Rename it: the favorite still opens it.
- Unstar from All pages: it leaves Favorites.
- Open another notes folder: it has its own favorites.
