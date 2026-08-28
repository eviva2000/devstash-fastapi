# Current Feature: Search and Filtering

## Status

Completed

## Active Spec

[Search and Filtering](features/search-and-filtering.md)

## Goals

- Search item titles and content.
- Filter results by item type and language.
- Provide clear empty-stash and no-results states.
- Keep search and filter state in shareable URL query parameters.
- Add server-side pagination and a PostgreSQL search index.

## Notes

- API returns a paginated response for item lists and uses PostgreSQL full-text
  search over title and content.
- Tags and data-backed collections remain intentionally out of scope.
- Browser URL parameters are the source of truth for the dashboard query view.

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
