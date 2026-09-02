# Current Feature: Authentication and Per-User Item Ownership

## Status

Completed

## Active Spec

[Authentication and Per-User Item Ownership](features/authentication-and-item-ownership.md)

## Goals

- Let a developer register with an email address and password, sign in, restore an
  existing browser session, and sign out.
- Protect the dashboard and all item API operations behind authentication.
- Assign every new item to the authenticated user without accepting ownership data
  from the client.
- Scope item creation, retrieval, listing, search, filtering, updates, and deletion
  to the authenticated owner at the database-query boundary.
- Prevent callers from discovering whether another user's item exists.
- Migrate existing shared-workspace items through an explicit, reviewed ownership
  policy before making `owner_id` mandatory.
- Add accessible registration, sign-in, session-loading, and sign-out states to the
  React application.

## Notes

- Scope is email/password authentication with opaque server-managed cookie sessions;
  GitHub sign-in and full account lifecycle workflows remain separate.
- Legacy items require explicit owner mapping; sessions use a 30-minute idle and
  30-day absolute lifetime with multiple active sessions; PostgreSQL stores shared,
  independently enforced source and account rate limits; account email remains while
  the account exists and stale sessions are purged after 30 days.
- The item API payload remains unchanged; ownership is server-controlled and foreign
  items are indistinguishable from unknown IDs.

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
