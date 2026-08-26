# Feature: Markdown Editor

## Status

Completed

## Summary

Add a reusable dark-themed Markdown editor and preview for note and prompt content.
Users can switch between writing and rendered GitHub Flavored Markdown while
editing, and see a preview-only presentation when viewing saved content.

## Goals

- Create a reusable `MarkdownEditor` component with accessible Write and Preview
  tabs.
- Render GitHub Flavored Markdown using `react-markdown` and `remark-gfm`.
- Use the Markdown editor for note and prompt content in item creation, editing, and
  read-only drawer views.
- Match the established dark item-content styling, including a copy control and a
  fluid content area capped at 400px.
- Give headings, code, lists, blockquotes, links, and tables reliable dark-theme
  presentation through a dedicated `.markdown-preview` CSS class.

## Non-Goals

- Change item API contracts, persistence models, migrations, or stored Markdown
  content.
- Add or redesign a code editor. Snippet and command create, edit, and view behavior
  stays unchanged from the current application.
- Add Markdown toolbars, formatting shortcuts, slash commands, syntax highlighting,
  collaborative editing, autosave, or image uploads.
- Enable raw HTML rendering or execute content embedded in Markdown.
- Add item routes, item types, collections, tags, search, or authentication.

## User Story

As a developer saving notes and prompts, I want to write Markdown and preview its
rendered structure so that longer knowledge entries are easy to compose and read.

## API Contract

No changes. Markdown remains plain text in the existing `content` field for
`POST /api/items` and `PATCH /api/items/{id}`, and existing item responses remain
unchanged.

## Data Model

No changes. Markdown source is persisted as the existing item `content` text.

## Component Contract

Create a controlled `MarkdownEditor` component that accepts:

- the Markdown string to display;
- an optional change callback for editable use;
- a read-only mode;
- an accessible label or equivalent association with the item content field.

Behavior:

- Editable mode opens on Write and offers both Write and Preview tabs.
- Write presents a labeled multiline input bound to the Markdown source.
- Preview renders the current source without saving or mutating it.
- Read-only mode presents Preview only and does not expose an editable text field.
- A header copy button copies the raw Markdown source in both modes.
- The tab interface exposes its selected state and panels accessibly and remains
  keyboard operable.

Use `react-markdown` with `remark-gfm`; do not enable raw HTML rendering.

## Styling Requirements

- Use `bg-[#1e1e1e]` for the editor container and `bg-[#2d2d2d]` for its header,
  aligned with the requested dark editor treatment.
- Keep the content area fluid up to `400px`; overflow scrolls within the editor so
  the surrounding drawer remains usable.
- Style rendered output under a dedicated `.markdown-preview` class rather than
  relying on browser defaults.
- Give `h1` through `h6` visibly distinct sizes and weights while preserving heading
  hierarchy.
- Render fenced code blocks on a dark background in a monospace font and distinguish
  inline code with a subtle background highlight.
- Give ordered and unordered lists visible markers and appropriate indentation.
- Give blockquotes a left accent border and readable muted text.
- Render links in blue with a visible hover state.
- Render tables with cell borders and a distinct header background, with horizontal
  overflow contained on narrow screens.
- Match the existing item drawer focus, border, text, and button treatment. The copy
  control must have an accessible name and use the same visual language as other
  drawer actions.

## Integration Points

- In the current codebase, new items are created by `ItemForm` inside create-mode
  `ItemDrawer`; this is the integration point corresponding to the supplied
  `NewItemDialog` requirement.
- `ItemForm` uses `MarkdownEditor` for note and prompt content in both create and edit
  mode.
- Read-only `ItemDrawer` details use `MarkdownEditor` in read-only mode for notes and
  prompts.
- Snippets and commands retain their current multiline edit control and read-only
  preformatted content. This feature does not introduce or change a `CodeEditor`.

## Acceptance Criteria

- [x] `react-markdown` and `remark-gfm` are declared frontend dependencies with the
  npm lockfile updated.
- [x] `MarkdownEditor` is a controlled, typed component with editable and read-only
  modes.
- [x] Editable mode defaults to Write and provides accessible Write and Preview
  tabs without changing the saved value when switching.
- [x] Read-only mode exposes Preview only and no editable content field.
- [x] The header copy control copies the raw Markdown source and is keyboard and
  screen-reader accessible.
- [x] Notes and prompts use `MarkdownEditor` when created or edited through
  `ItemForm`.
- [x] Notes and prompts render through the read-only Markdown preview in
  `ItemDrawer` details.
- [x] Snippet and command create, edit, and read-only presentations remain unchanged.
- [x] GitHub Flavored Markdown tables, task lists, strikethrough, and autolinks render
  through `remark-gfm`.
- [x] Headings, fenced and inline code, lists, blockquotes, links, and tables have the
  required dark-theme styles under `.markdown-preview`.
- [x] The editor uses the requested container/header colors, remains fluid up to
  400px, and contains overflow on desktop and mobile drawer widths.
- [x] Markdown is rendered as React content without enabling raw HTML execution.
- [x] Existing item CRUD and health behavior remain unchanged.
- [x] Frontend dependency, type, lint, format, unit, build, and relevant browser
  checks pass.

## Test Plan

- Add Vitest coverage for editable default state, tab switching, controlled changes,
  read-only mode, accessible tab semantics, and clipboard behavior.
- Verify representative GitHub Flavored Markdown output, including a table, task
  list, strikethrough, autolink, fenced code, inline code, list, blockquote, and
  heading hierarchy.
- Update item form and drawer tests to prove that notes and prompts use Markdown
  editing/preview while snippets and commands keep their existing presentation.
- Add a Playwright journey that creates a Markdown note, previews it before saving,
  reopens its read-only drawer rendering, edits it through Write/Preview, and keeps
  the dashboard route unchanged.
- [x] `uv run pytest`
- [x] `uv run ruff check .`
- [x] `uv run ruff format --check .`
- [x] `uv run mypy`
- [x] `uv run alembic check`
- [x] `cd frontend && npm run typecheck`
- [x] `cd frontend && npm run lint`
- [x] `cd frontend && npm run format:check`
- [x] `cd frontend && npm run test`
- [x] `cd frontend && npm run build`
- [x] `cd frontend && npm run test:e2e`

## Security and Privacy

- Treat Markdown as untrusted user-authored text and rely on `react-markdown`'s safe
  rendering defaults.
- Do not add `rehype-raw`, `dangerouslySetInnerHTML`, script execution, or command
  execution.
- Copy only after an explicit user action and report clipboard failure without
  altering saved content.
- Do not send Markdown content to new services or analytics.

## Decisions and Open Questions

Selected decisions:

- Markdown applies only to note and prompt items.
- The persisted value remains raw Markdown text; preview is a frontend-only concern.
- The current create-mode `ItemDrawer` plus `ItemForm` fulfills the supplied
  `NewItemDialog` integration point because no separate dialog exists in this
  repository.
- No `CodeEditor` exists in the current repository. Snippet and command behavior is
  intentionally left untouched rather than adding one under this feature.
- Successful copy shows temporary visible “Copied” feedback through an accessible
  live region; failures are also reported without altering content.

## Implementation Notes

- Keep Markdown rendering and clipboard behavior inside a focused component; item
  API access remains outside it.
- Prefer component props based on `value`, `onChange`, and `readOnly` rather than
  coupling the editor to item persistence or drawer state.
- Add the two requested packages through npm and commit the resulting lockfile
  changes only after implementation is authorized and verified.
- Place `.markdown-preview` rules in the existing frontend global stylesheet unless
  implementation reveals an established component stylesheet convention.

## Completion Notes

Delivered a reusable controlled `MarkdownEditor` with accessible mouse and keyboard
tab behavior, safe GitHub Flavored Markdown rendering, raw-source copying with live
feedback, and dedicated dark preview styling. Notes and prompts use the editor in
create and edit forms and a preview-only presentation in item details, while snippet
and command behavior remains unchanged.

Verified on 2026-08-26 with 26 passing backend tests, 21 passing frontend unit tests,
and 7 passing Playwright tests. Ruff lint and formatting, Mypy, Alembic schema check,
frontend TypeScript, ESLint, Prettier, and the production build also passed.
