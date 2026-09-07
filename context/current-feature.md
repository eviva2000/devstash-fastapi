# Current Feature: Sidebar Live Data

## Status

Completed

## Active Spec

[Sidebar Live Data](features/sidebar-live-data.md)

## Goals

- Replace the sidebar's mock item-type catalog and counts with values derived from
  authenticated, owner-scoped item data.
- Keep the sidebar collection list sourced from the authenticated collection service
  and remove any remaining runtime dependency on mock collection data.
- Update sidebar item-type counts immediately after successful item creation,
  type changes, and deletion without requiring a full-page reload.
- Update sidebar collection entries immediately after successful collection creation
  while preserving the established ordering and display limits.
- Represent loading, failure, and empty states without displaying invented counts or
  stale mock records.

## Notes

- Item-type totals are derived from the existing complete, owner-scoped client item
  state, independently of the visible item's filters and pagination; no aggregate
  API is needed.
- Collection entries already come from the authenticated collection service; this
  feature prevents regressions and removes remaining sidebar mock dependencies.
- Per-collection item counts and type badges require collection membership and stay
  out of scope.
- Show only the four persisted item types in the authenticated sidebar; Files,
  Images, and Links remain future product types.

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
- [Authentication and Per-User Item Ownership](features/authentication-and-item-ownership.md)
  - Email/password sessions, CSRF protection, PostgreSQL-backed authentication rate
  limits, explicit legacy ownership migration, and owner-scoped item access
  (Completed).
- [Collection Creation](features/collection-creation.md) - Owner-scoped PostgreSQL
  collections, authenticated list/create API endpoints, and an accessible dashboard
  creation workflow with synchronized client collection surfaces (Completed).
- [Sidebar Live Data](features/sidebar-live-data.md) - Authenticated item-type counts
  and collection entries synchronized across desktop and mobile sidebars (Completed).
