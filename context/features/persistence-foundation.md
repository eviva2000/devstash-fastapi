# Feature: PostgreSQL Persistence Foundation

## Status

Completed

## Summary

Establish a typed, migration-managed PostgreSQL persistence layer for the FastAPI
backend so later item, collection, tag, and account features can store data through
a consistent database boundary.

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

## Non-Goals

- Define item, collection, tag, user, session, or subscription tables.
- Implement CRUD endpoints, repositories, or user-facing database features.
- Add authentication or authorization.
- Add production database hosting, deployment automation, backups, replicas, or
  connection-pool infrastructure outside the application process.
- Add Redis, search infrastructure, object storage, or another database engine.
- Change the frontend or add a database status indicator to the application shell.

## User Story

As a developer, I want a tested PostgreSQL and migration foundation so that product
features can add durable data models without inventing configuration, session, and
schema-management patterns each time.

## API Contract

No public endpoint changes.

The existing `GET /health` contract remains a process-level liveness check and must
continue returning `200 OK` with:

```json
{"status": "ok"}
```

Database availability must not be added to this response. A separate readiness
contract may be specified later if deployment requirements need one.

## Data Model

No DevStash domain tables are introduced by this feature.

The persistence foundation must provide:

- a shared SQLAlchemy declarative base and metadata object for future models;
- PostgreSQL-compatible naming conventions for primary key, foreign key, unique,
  check, and index constraints so migration output is stable;
- Alembic's version table, created when migrations are applied;
- an initial no-domain-schema migration that proves a clean database can move from
  an unversioned state to the current migration head and back to base.

Future domain schemas must be delivered in their own feature migrations.

## Configuration Contract

- `DATABASE_URL` is the single required application database setting.
- The URL uses SQLAlchemy's Psycopg dialect and must not be hard-coded in application
  or migration code.
- Application settings are read through a typed `pydantic-settings` model.
- A safe `.env.example` documents the variable without containing real credentials.
- Local development may load values from an uncommitted `.env` file.
- Tests must use a dedicated test database and must never reuse a non-test database
  URL supplied for development or production.
- Missing or malformed database configuration must produce a clear startup or
  command error without printing credentials.

## Persistence Contract

- Create one application-level asynchronous SQLAlchemy engine and session factory.
- Supply a new `AsyncSession` per FastAPI request through a dependency using a
  context-managed lifetime.
- Do not share an `AsyncSession` between requests or concurrent tasks.
- The dependency closes the session after success or failure.
- Service or repository code owns transaction intent; the session dependency must
  not silently commit arbitrary request work.
- Roll back failed transactions before a session can be reused or closed.
- Keep engine creation, settings, session construction, and declarative metadata in
  focused modules under `src/devstash/core/` or an equally clear infrastructure
  boundary.

## Migration Contract

- Store Alembic configuration in the repository and keep migration scripts under a
  predictable backend directory.
- Alembic reads the database URL from the same typed application settings source; no
  credential-bearing URL is committed to Alembic configuration.
- Configure Alembic autogeneration with the shared SQLAlchemy metadata.
- Support these documented commands from the repository root:
  - create a migration with a descriptive revision message;
  - upgrade a database to `head`;
  - show the current revision and history;
  - downgrade one revision;
  - check whether model metadata would generate an unexpected migration.
- Every generated migration must be reviewed before it is applied or committed.
- Both `upgrade()` and `downgrade()` must be implemented for repository migrations.

## Acceptance Criteria

- [x] Backend dependencies include SQLAlchemy 2.x, Alembic, Psycopg 3, and
  `pydantic-settings`, with `uv.lock` updated.
- [x] PostgreSQL is the documented and tested persistence engine; SQLite is not used
  as a substitute for persistence integration tests.
- [x] A developer can create the local and test databases using one documented,
  repeatable setup workflow.
- [x] `.env.example` documents a safe local `DATABASE_URL`, while `.env` and other
  credential-bearing environment files remain ignored by Git.
- [x] A typed settings object validates `DATABASE_URL` and does not expose its
  password through normal string or representation output.
- [x] The backend provides an asynchronous engine, session factory, declarative base,
  metadata naming convention, and per-request session dependency.
- [x] Alembic is configured from the shared settings and metadata rather than a
  duplicated hard-coded database URL.
- [x] An empty PostgreSQL database can upgrade to Alembic `head`, reports that exact
  revision, downgrades to `base`, and upgrades to `head` again.
- [x] A focused integration test proves a database query can run through a managed
  asynchronous session.
- [x] A focused test proves changes made inside a rolled-back test transaction do not
  leak into another test.
- [x] A migration consistency check fails when SQLAlchemy metadata and the migration
  head differ.
- [x] Existing `GET /health` behavior and frontend health-status behavior remain
  unchanged.
- [x] README setup, development, migration, and test instructions are updated.
- [x] All backend and frontend quality gates pass.

## Test Plan

- Test settings validation with a valid PostgreSQL URL, a missing URL, and a malformed
  URL without asserting or logging a real password.
- Test that the session dependency yields an `AsyncSession` and closes it after its
  context ends.
- Run a simple statement against a dedicated PostgreSQL test database.
- Prove test isolation with a transaction that is rolled back before the next test.
- Starting from an empty test database, apply migrations to `head`, verify the current
  revision, downgrade to `base`, and upgrade to `head` again.
- Run Alembic's migration consistency check against the current metadata.
- Re-run the existing API test to confirm `GET /health` is unchanged.
- [x] `uv run pytest`
- [x] `uv run ruff check .`
- [x] `uv run ruff format --check .`
- [x] `uv run mypy`
- [x] `cd frontend && npm run typecheck`
- [x] `cd frontend && npm run lint`
- [x] `cd frontend && npm run format:check`
- [x] `cd frontend && npm run test`
- [x] `cd frontend && npm run build`
- [x] Relevant Playwright end-to-end tests are not required because this feature has
  no browser-visible behavior; the existing suite must still pass before completion.

## Security and Privacy

- Never commit real database credentials or production connection strings.
- Use separate credentials and databases for local development, automated tests, and
  production.
- Redact passwords from errors, logs, settings representations, and test output.
- Use a least-privilege application database role; schema-owner or administrative
  credentials are only for database creation and migrations when required.
- Do not build SQL statements with untrusted string interpolation. Future persistence
  code must use SQLAlchemy expressions and bound parameters.
- Ensure tests positively identify their target as a test database before performing
  destructive migration or cleanup operations.

## Decisions and Open Questions

Selected technical direction:

- PostgreSQL is the only supported application database.
- SQLAlchemy 2.x supplies the ORM, SQL expression, engine, and session APIs.
- SQLAlchemy's asyncio API is used so database I/O does not block asynchronous
  FastAPI request handling.
- Psycopg 3 supplies PostgreSQL connectivity.
- Alembic manages versioned schema migrations.
- `pydantic-settings` supplies typed environment configuration.
- `GET /health` remains a liveness endpoint and does not query the database.

Selected implementation decisions:

- Use the pinned PostgreSQL 18 Alpine image through Docker Compose for the repeatable
  local server workflow. Persist the development database in a named volume.
- Configure Alembic asynchronously and use the same `DATABASE_URL` settings source as
  the application.
- Have pytest create a uniquely named disposable test database against the Compose
  PostgreSQL server for the test session and remove it afterward.
- Do not add a test-container dependency or use SQLite for persistence tests.

## Implementation Notes

- Prefer SQLAlchemy 2.x typed declarative mappings (`Mapped` and `mapped_column`) when
  the first domain model is introduced.
- Keep the engine long-lived, but keep each session local to one request, task, or
  explicit unit of work.
- Use `expire_on_commit=False` only if a later service contract needs returned ORM
  values after commit; do not select it by habit.
- Do not call `metadata.create_all()` in application startup or tests as a replacement
  for Alembic migrations.
- Do not add a placeholder domain table merely to demonstrate persistence.
- If Docker Compose is selected, pin the PostgreSQL major version, add a health check,
  persist local development data in a named volume, and keep test data disposable.
- Keep database-backed tests deterministic and independent of execution order.

## Completion Notes

Delivered a PostgreSQL 18 Compose service, typed and password-redacting database
settings, shared asynchronous SQLAlchemy engine/session infrastructure, and an
Alembic baseline configured from the application metadata and settings. Added
disposable PostgreSQL integration databases covering managed sessions, rollback
isolation, migration round-trips, and metadata drift, plus documented local setup,
migration, and verification workflows.

Verified with the complete backend and frontend quality gates: 12 pytest tests, Ruff
lint and formatting, strict Mypy, Alembic metadata consistency, TypeScript, ESLint,
Prettier, 3 Vitest tests, the Vite production build, and 1 Playwright journey.
