# Feature: Code Editor

## Status

Completed

## Summary

Add a reusable Monaco-based code editor for snippet and command content. The editor
supports editing and read-only display in the item drawer, with a dark theme,
macOS-style window chrome, a language label, quick copy, and contained scrolling.

## Goals

- Create a reusable, controlled `CodeEditor` component powered by Monaco Editor.
- Use `CodeEditor` for snippet and command content in create, edit, and read-only
  item drawer views.
- Support typed editable and read-only modes without changing stored item content.
- Add a dark editor header with decorative macOS window dots, a language label, and
  an accessible quick-copy control.
- Keep the editor fluid and responsive up to 400px high, with themed scrollbars and
  overflow contained inside the editor.
- Preserve the existing Markdown editor behavior for notes and prompts.

## Non-Goals

- Change item API contracts, persistence models, migrations, or stored content.
- Add new item types or apply Monaco to note or prompt content.
- Add code execution, terminal behavior, formatting, linting, autocomplete services,
  collaborative editing, autosave, file management, or syntax-error persistence.
- Add a language selector beyond the existing optional snippet language field unless
  separately specified.
- Replace or redesign the existing Markdown editor.

## User Story

As a developer saving snippets and commands, I want code-focused editing and display
so that technical content is easier to read, copy, and update.

## API Contract

No changes. Snippet and command source remains plain text in the existing `content`
field for `POST /api/items` and `PATCH /api/items/{id}`, and item responses remain
unchanged.

## Data Model

No changes. The existing optional `language` field continues to apply to snippets;
commands do not gain a persisted language under this feature.

## Component Contract

Create a controlled `CodeEditor` component that accepts:

- the source string to display;
- an optional change callback for editable use;
- a read-only mode;
- a Monaco language identifier or defined display fallback;
- an accessible content label or equivalent association;
- existing validation metadata needed by `ItemForm`, including maximum length,
  invalid state, and error-description association where Monaco supports it.

Behavior:

- Editable mode updates the controlled source through the change callback.
- Read-only mode displays selectable source without exposing editing behavior.
- The header shows decorative red, yellow, and green macOS-style window dots.
- The header shows the resolved language next to an accessible copy button.
- Copy writes the raw source after an explicit user action and provides visible,
  screen-reader-accessible success or failure feedback.
- Monaco uses a dark theme in both modes and lays out correctly when the drawer or
  viewport width changes.
- The content area grows fluidly up to 400px; additional content scrolls inside the
  editor using scrollbars styled to match the dark theme.

## Integration Points

- `ItemForm` uses `CodeEditor` for snippet and command content in create and edit
  mode.
- Read-only `ItemDrawer` details use `CodeEditor` for snippets and commands.
- Notes and prompts retain their current `MarkdownEditor` create, edit, and read-only
  behavior. The requirement to keep a textarea for non-code types means Monaco must
  not replace that established flow.
- The existing snippet language input remains the source for snippet language when
  present.

## Acceptance Criteria

- [x] Required Monaco frontend dependencies are declared and the npm lockfile is
  updated.
- [x] `CodeEditor` is a reusable, controlled, typed component with editable and
  read-only modes.
- [x] Monaco renders with a dark theme and syntax mode derived from the resolved
  language.
- [x] Snippets and commands use `CodeEditor` when created or edited through
  `ItemForm`.
- [x] Snippets and commands use read-only `CodeEditor` presentation in `ItemDrawer`
  details.
- [x] Notes and prompts retain their existing `MarkdownEditor` behavior and do not
  load Monaco as their content editor.
- [x] The header contains red, yellow, and green macOS-style dots that are decorative
  to assistive technology.
- [x] The header presents a readable language label next to an accessible copy
  button.
- [x] Copy writes the raw source and reports success or failure accessibly without
  mutating content.
- [x] Read-only source remains selectable and copyable but cannot be edited.
- [x] The editor is responsive, remains at or below 400px high, and contains vertical
  and horizontal overflow on desktop and mobile drawer widths.
- [x] Monaco scrollbars and surrounding editor chrome match the established dark
  item-content styling.
- [x] Switching item types preserves current form validation and does not submit a
  language for non-snippet items.
- [x] Existing item CRUD, Markdown editor, and health behavior remain unchanged.
- [x] Frontend dependency, type, lint, format, unit, build, and relevant browser
  checks pass.

## Test Plan

- Add Vitest coverage for controlled edits, read-only behavior, resolved language,
  accessible copy feedback, decorative window dots, validation metadata, and the
  400px height/overflow contract. Mock the Monaco browser boundary where necessary.
- Update item form and drawer tests to prove snippets and commands use `CodeEditor`
  while notes and prompts retain `MarkdownEditor`.
- Add or update a Playwright journey that creates a snippet, verifies the editor
  chrome and language, saves it, reopens the read-only editor, copies it, edits it,
  and keeps the dashboard route unchanged.
- Verify the command fallback language and an unsupported or missing snippet
  language once the language-resolution decision is made.
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

- Treat saved source as untrusted text and never execute it.
- Do not enable browser workers or Monaco features that send source to remote
  services.
- Copy only after an explicit user action and do not send source to analytics or new
  integrations.
- Preserve the existing content length validation at the form and API boundaries.

## Decisions and Open Questions

Selected decisions:

- Monaco applies only to snippet and command items.
- Notes and prompts keep the existing Markdown editor rather than reverting to a
  plain standalone textarea.
- This is a frontend presentation feature; API and database contracts do not change.
- The macOS-style dots are decorative and do not minimize, maximize, or close the
  item drawer.
- Use `@monaco-editor/react` with `monaco-editor` for the Vite integration.
- Commands display `Shell` and use Monaco's `shell` language mode without persisting
  a language.
- Empty or unsupported snippet languages display `Plain Text` and use Monaco's
  `plaintext` mode.

## Implementation Notes

- Keep Monaco setup, language resolution, copy behavior, and responsive layout
  inside a focused component or nearby utility; item API access remains outside it.
- Preserve the existing `ItemForm` maximum content length and accessible error
  association.
- Monaco worker and bundler configuration must work with the current Vite build and
  must not fetch editor assets from a CDN.
- Starting this feature authorizes scoped dependency and application changes, but
  not commits, merges, pushes, deployment, publication, or file deletion.

## Completion Notes

Delivered Monaco-based controlled code editors for snippet and command creation,
editing, and read-only presentation, with local Vite worker assets, dark editor
chrome, resolved language labels, and accessible copy feedback. Notes and prompts
continue to use the Markdown editor.

Verified on 2026-08-27: 26 backend tests, Ruff, formatting, Mypy, and Alembic check;
frontend type checking, linting, formatting, 27 Vitest tests, production build, and
7 Playwright Chromium journeys all passed.
