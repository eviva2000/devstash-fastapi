# Current Feature: Collection Creation

## Status

Completed

## Active Spec

[Collection Creation](features/collection-creation.md)

## Goals

- Persist collections in PostgreSQL and scope every collection read and create to
  the authenticated owner.
- Provide typed server-side collection access and authenticated HTTP endpoints for
  collection listing and creation, following the existing item boundaries.
- Load collection data from the server instead of importing the mock collection
  catalog into user-facing dashboard surfaces.
- Add a top-bar button that opens an accessible modal for collection name and
  description.
- Validate and save the form through the collection API, show an accessible success
  or failure toast, and prevent duplicate submissions while saving.
- Add the created collection to every collection-backed client surface without a
  full-page reload.

## Notes

- Previous-project references to Server Components and `lib/db` are adapted to the
  selected React/Vite and FastAPI stack: typed frontend API calls backed by FastAPI
  services and owner-scoped repositories.
- Names and descriptions are required with 200- and 2,000-character limits;
  duplicate names are allowed, accents are derived in the frontend, and toast UI
  stays project-owned.
- Creation must immediately update all collection consumers while preserving the
  existing recent-grid limits and sidebar grouping.
- Implementation sequence: persistence and owner-scoped backend API; typed frontend
  API/state; modal and toast workflow; synchronized dashboard consumers; focused and
  full verification.

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
