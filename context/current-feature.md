# Current Feature: Markdown Editor

## Status

Completed

## Active Spec

[Markdown Editor](features/markdown-editor.md)

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

## Notes

- This is a frontend-only presentation feature; item API and database contracts do
  not change.
- The actual creation surface is `ItemForm` inside create-mode `ItemDrawer`; no
  separate `NewItemDialog` currently exists.
- No `CodeEditor` currently exists. Snippet and command edit/view behavior must stay
  unchanged rather than adding one under this feature.
- Markdown applies only to notes and prompts, and raw HTML rendering remains
  disabled.
- The explicitly requested `react-markdown` and `remark-gfm` dependencies are
  installed and locked for the frontend.
- Successful copy will show temporary visible “Copied” feedback in an accessible
  live region; failures will be reported without changing content.
- The linked spec is the source of truth; goals here are its working copy.
- Allowed statuses are `Not Started`, `In Progress`, `Blocked`, and `Completed`.

## History

- [Health Endpoint](features/health-endpoint.md) - Initial `GET /health` endpoint
  returning `{"status": "ok"}`.
- [Full-Stack Application Foundation](features/application-foundation.md) - React and
  TypeScript frontend with Vite, Tailwind CSS, shadcn/ui, FastAPI health integration,
  Vitest, and Playwright (Completed).
- [PostgreSQL Persistence Foundation](features/persistence-foundation.md) - PostgreSQL
  18, typed settings, asynchronous SQLAlchemy sessions, Alembic migrations, and
  isolated database integration tests (Completed).
- [Dashboard UI](features/dashboard-ui.md) - Responsive dark dashboard with React
  Router, typed mock data, desktop sidebar, mobile drawer, stats, collections, and
  item overviews (Completed).
- [Item CRUD](features/item-crud.md) - PostgreSQL-backed CRUD API and responsive
  dashboard drawer workflow for snippets, prompts, commands, and notes (Completed).
- [Markdown Editor](features/markdown-editor.md) - Accessible Markdown writing and
  GitHub Flavored Markdown previews for note and prompt workflows (Completed).
