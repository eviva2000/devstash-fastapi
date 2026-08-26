# Current Feature: Item CRUD

## Status

Completed

## Active Spec

[Item CRUD](features/item-crud.md)

## Goals

- Define one consistent item record for snippets, prompts, commands, and notes.
- Provide a documented, typed JSON API to create, list, retrieve, update, and delete
  items.
- Persist items in PostgreSQL using SQLAlchemy models, repositories, and an Alembic
  migration.
- Add an accessible React interface for listing, creating, editing, and deleting
  items with explicit loading, empty, validation, and error states.
- Preserve clear backend and frontend boundaries for later product features.

## Notes

- This initial CRUD slice is unauthenticated and belongs to one local workspace.
- Only snippet, prompt, command, and note items are supported. Collections, tags,
  search, favorites, pins, links, files, images, and accounts remain out of scope.
- The API is rooted at canonical FastAPI `/api/items` routes. Vite forwards `/api/*`
  and `/health` unchanged.
- React Router and the dashboard shell already exist; this feature does not select
  another routing or state-management dependency.
- Selecting an item opens its drawer. Viewing, editing, saving, and canceling happen
  inside that drawer without changing routes.
- Implementation and all documented quality gates are verified on
  `feature/item-crud`; commit still requires user approval.
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
