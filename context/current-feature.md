# Current Feature: PostgreSQL Persistence Foundation

## Status

Completed

## Active Spec

[PostgreSQL Persistence Foundation](features/persistence-foundation.md)

## Goals

- Select and configure PostgreSQL as the application database.
- Add SQLAlchemy 2.x with asynchronous database sessions and Psycopg 3 as the
  PostgreSQL driver.
- Add Alembic and a documented workflow for creating, applying, inspecting, and
  reverting schema migrations.
- Introduce one typed settings layer for database configuration.
- Provide a FastAPI dependency that gives each request its own database session and
  always releases it.
- Establish deterministic PostgreSQL integration tests for connection, transaction,
  and migration behavior.
- Document local database setup and persistence quality checks.

## Notes

- This infrastructure feature does not add domain tables, CRUD endpoints, or frontend
  behavior; `GET /health` remains unchanged.
- Selected PostgreSQL 18 Alpine through Docker Compose, Alembic's asynchronous
  configuration using `DATABASE_URL`, and uniquely named disposable test databases
  created by pytest against the Compose PostgreSQL server.
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
