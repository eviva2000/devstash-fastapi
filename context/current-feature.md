# Current Feature: Collection Management

## Status

Completed

## Active Spec

[Collection Management](features/collection-management.md)

## Goals

- Make each dashboard collection card open an accessible collection drawer.
- Let the authenticated owner edit and persist a collection's name and description.
- Let the authenticated owner delete a collection only after explicit confirmation
  in a shadcn AlertDialog.
- Synchronize successful edits and deletions across every collection-backed dashboard
  surface without a full-page reload.
- Let the owner add existing items to or remove items from an open collection drawer.
- Provide clear saving, deletion, validation, success, and failure feedback.

## Notes

- Add owner-scoped, CSRF-protected PATCH and DELETE collection endpoints using the
  existing repository/service/API boundaries.
- Reuse the collection creation validation limits: name and description are required,
  with maximum lengths of 200 and 2,000 characters.
- Open the drawer from dashboard collection cards; sidebar and global-search
  selections keep their current navigation behavior.
- Persist owner-scoped item membership and derive collection counts and type badges;
  soft deletion and editing favorites remain out of scope.
- Show only current members in drawer read mode; expose non-member items through a
  shadcn Select while editing, with removal controls for existing members.

## History

- [Collection Management](features/collection-management.md) - Owner-scoped
  collection editing, confirmed deletion, and persisted item membership in an
  accessible dashboard drawer (Completed).
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
