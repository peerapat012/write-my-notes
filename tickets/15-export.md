# 15 — Export PNG/SVG

**Depends on:** 05

## Goal
Get a board out as an image.

## Scope
- The Export dropdown in the top bar offers PNG or SVG.
- It exports the selection when something is selected, otherwise the whole board.
- Use `exportToBlob` and `exportToSvg`, then download through an `<a download>` link.

## Acceptance
- Exported files open correctly and match what is on the canvas.
