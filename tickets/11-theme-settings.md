# 11 — Theme + settings

**Depends on:** 02

## Goal
Add light/dark theme and a Settings panel.

## Scope
- Theme toggle (light / dark / system), applied to the shell, Milkdown and Excalidraw (`theme` prop).
- Settings panel fields:
  - theme
  - Gemini model name (default: a current Flash model)
- All settings are stored in `localStorage`. The API key is not a setting (see SPEC "Security").

## Acceptance
- Switch the theme: every surface follows.
- Reload: the theme and model name persist.
