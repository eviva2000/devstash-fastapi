# Current Feature: Code Editor

## Status

Completed

## Active Spec

[Code Editor](features/code-editor.md)

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

## Notes

- This is a frontend-only presentation feature; item API and database contracts do
  not change.
- Monaco applies only to snippet and command content. Notes and prompts retain the
  completed Markdown editor flow.
- Commands use the fixed header label `Shell` and Monaco's `shell` language mode.
- Empty or unsupported snippet languages use the `Plain Text` label and Monaco's
  `plaintext` mode.
- Monaco is integrated through `@monaco-editor/react` with `monaco-editor`.
- Monaco integration must work with Vite using locally bundled assets and no CDN.
- Starting this feature authorizes its scoped dependency and application changes,
  but not commits, merges, pushes, deployment, publication, or file deletion.
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
