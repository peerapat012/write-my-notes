# 06 — Board tools: sticky, emoji, image

**Depends on:** 05

## Goal
Add the remaining toolbar tools.

## Scope
- Sticky note: click to place a filled, rounded rect with bound text and a default size. The fill comes from the style bar.
- Emoji: a picker that places a large text element showing the emoji.
- Image: insert from a file picker or by paste. Save the file to `assets/`.
- Board image round trip (pure functions):
  - Before save: replace data URLs in `files` with relative `assets/` paths.
  - On load: read the assets and feed them to `addFiles`.

## Tests
- Image round trip: data URL to path and back, with element `fileId`s preserved.

## Acceptance
- The `.excalidraw` file holds no base64 image data.
- Images show again after reload.
