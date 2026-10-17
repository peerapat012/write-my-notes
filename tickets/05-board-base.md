# 05 — Board base + custom UI

**Depends on:** 02

## Goal
Open `.excalidraw` pages in Excalidraw, wrapped in our own UI to match the reference screenshots.

## Scope
- Embed `@excalidraw/excalidraw`, and hide its default toolbar and menus with `UIOptions` and CSS.
- Top bar: back, title, undo/redo, zoom −/%/+, AI button (placeholder), Export button (placeholder).
- Left toolbar: select, hand, text, pen (freedraw), rect, ellipse, diamond, line, arrow, eraser. Wire each to `setActiveTool`.
- Floating style bar for the selection: fill colours, font (sans / handwritten), size presets 14/18/24/34/48.
- Defaults: `roughness: 0`, sans font, dotted grid background.
- Load and save with `serializeAsJSON`, keeping the top-level `"icon"` field. Autosave is debounced to ~500 ms, with a dirty flag.

## Acceptance
- Draw shapes, then reload: the shapes persist.
- The `.excalidraw` file is valid, and excalidraw.com can open it.
- No default Excalidraw chrome is visible.
