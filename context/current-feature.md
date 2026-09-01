# Current Feature: Global Search / Command Palette

## Status

Completed

## Active Spec

[Global Search / Command Palette](features/global-search.md)

## Goals

- Open global search from the top bar or with Command+K / Control+K.
- Fuzzy-search all prefetched items and collections on the client.
- Group results into Items and Collections with useful identifying metadata.
- Support arrow-key navigation and Enter selection through the shadcn Command widget.
- Open an item drawer or navigate to the selected collection surface.

## Notes

- Palette queries remain client-side after items are prefetched.
- Existing server-side filters, pagination, and URL-backed query views stay intact.
- Collections remain mock-backed; selection targets their dashboard card until the
  collection feature introduces dedicated routes.

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
- [Search and Filtering](features/search-and-filtering.md) - PostgreSQL-backed
  title/content retrieval, filters, shareable URL state, and pagination (Completed).
- [Global Search / Command Palette](features/global-search.md) - Prefetched,
  client-side fuzzy search across items and collections with keyboard navigation
  (Completed).
