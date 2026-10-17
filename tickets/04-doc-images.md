# 04 — Images in docs

**Depends on:** 03

## Goal
Pasted or dropped images land in `assets/`, not in the markdown.

## Scope
- On paste or drop, write the image to `assets/img-<id>.<ext>`, creating `assets/` if needed, then insert a relative `![](...)`.
- The relative path is computed from the doc's own folder.
- Render images by resolving the relative path to a blob URL through the folder handle.

## Tests
- Pure function for the relative path from a doc path to an asset path.

## Acceptance
- Paste a screenshot: a file appears in `assets/`, and the `.md` holds only the path.
- Reload: the image still shows.
