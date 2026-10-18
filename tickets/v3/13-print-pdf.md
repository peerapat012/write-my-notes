# v3-13 — Print to PDF

**Depends on:** —

## Goal
Share a doc as a PDF with someone who does not have the app.

## Scope
- **Print / Save as PDF** in a doc's page menu calls `window.print()`.
- Print CSS hides the app shell (sidebar, title bar, right panel, toolbars, block handles). It prints the title, properties, body, images, Mermaid diagrams, tables and task blocks.
- Print uses light colors, whatever the app theme.
- Web and desktop. Check that `window.print()` opens the dialog in WebView2.

## Out of scope
- Boards (they already export PNG/SVG). A PDF library. Page headers and footers.

## Tests
- None (CSS only).

## Acceptance
- Print a doc with an image, a Mermaid diagram and a task block from the desktop app: the PDF shows all three and none of the app chrome.
- Printing from dark mode gives a light PDF.
