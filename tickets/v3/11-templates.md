# v3-11 — Templates

**Depends on:** 07, 10

## Goal
Start a doc from a ready layout.

## Scope
- Built-in templates in code: Meeting notes, Journal, Task list (with a task block).
- User templates: `.md` files in `.templates/`.
  - **Save as template** in a doc's page menu writes the body (without `created`) to `.templates/<page name>.md`. If the name is taken, ask to replace it.
  - `.templates/` stays out of the sidebar, Ctrl+K and All pages.
- New doc creates a blank `Untitled.md` (ticket 07). The template picker opens from the Start row, and from a "New from template" item in the sidebar new-page menu. It lists the built-ins, then the user templates.
- An empty doc shows a row under the body: "Start: **With AI** · **Template**". With AI opens `/ai`. Template opens the template picker and fills the doc. The row hides once the doc has content.
- A doc from a template gets a fresh `created`. Other placeholders (such as the date) are the implementer's choice.
- Web and desktop. No board templates.
- New UI: design it with `/impeccable` and `/ui-ux-pro-max`.

## Out of scope
- Editing or deleting templates in the app (users edit the `.templates/` files directly). Board templates.

## Tests
- Template body to new doc: `created` replaced, other front matter kept.

## Acceptance
- A new doc from Meeting notes has its headings.
- An empty doc shows the Start row. Typing hides it. Template from the row fills the doc.
- Save a doc as a template, then create from it: the body matches.
- `.templates/` is not in the tree.
