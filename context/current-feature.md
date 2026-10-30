# Current Feature: Production Deployment

## Status

In Progress

## Active Spec

[Production Deployment](features/production-deployment.md)

## Goals

- Deploy the React frontend and FastAPI backend as one same-origin web service so
  the existing relative API requests and secure session cookies work unchanged.
- Define a free Render web service and connect it to a free Neon PostgreSQL database.
- Build a deterministic production container that installs locked dependencies,
  builds the frontend, serves the application, and listens on Render's assigned
  port.
- Apply Alembic migrations manually before new application code receives traffic.
- Document production configuration, first deployment, verification, and rollback.

## Notes

- Use a free Render Docker web service with a separate Neon PostgreSQL database.
- Keep frontend and API on one HTTPS origin because authentication currently uses
  secure `SameSite=Lax` cookies and exact-origin CSRF checks.
- Disable automatic deploys and run migrations manually before each deployment.
- Neon supplies a `postgresql://` connection string; the application requires
  the Psycopg SQLAlchemy dialect. Client IP handling behind Render's proxy also
  needs verification to preserve authentication rate limiting.

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
