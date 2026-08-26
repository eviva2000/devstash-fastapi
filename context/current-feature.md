# Current Feature: Dashboard UI

## Status

Completed

## Active Spec

[Dashboard UI](features/dashboard-ui.md)

## Goals

- Add a responsive dark `/dashboard` route and top bar.
- Build a collapsible desktop sidebar and accessible mobile drawer.
- Present dashboard stats, collections, and at most six recent items from mock data.
- Keep the dashboard UI-only until a later CRUD feature supplies real data.

## Notes

- The attached dashboard phases are consolidated into one UI-only feature using typed local mock data; Item CRUD remains Not Started.
- Search, New Item, and New Collection controls are display-only. The detail drawer is out of scope.
- The desktop sidebar must remain visible while the dashboard content scrolls.
- Mock data has no pinned items, and the dashboard has no pinned-items section.
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
