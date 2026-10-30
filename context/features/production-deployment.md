# Production Deployment

## Status

In Progress

## Summary

Prepare DevStash for repeatable production deployment from GitHub as one
same-origin web application backed by managed PostgreSQL.

## Goals

- Deploy the React frontend and FastAPI backend as one same-origin web service so
  the existing relative API requests and secure session cookies work unchanged.
- Define a free Render web service and connect it to a free Neon PostgreSQL database.
- Build a deterministic production container that installs locked dependencies,
  builds the frontend, serves the application, and listens on Render's assigned
  port.
- Apply Alembic migrations manually before new application code receives traffic.
- Document production configuration, first deployment, verification, and rollback.

## Non-Goals

- Deploying resources or changing DNS from this repository task.
- Adding a separate Vercel frontend deployment.
- Adding CI workflows that duplicate Render's GitHub auto-deploy integration.
- Adding object storage, background workers, analytics, or paid monitoring services.
- Changing authentication, API contracts, or the PostgreSQL schema.

## User Story

As the project owner, I want a repeatable GitHub-driven production deployment so
that I can release DevStash without manually rebuilding its frontend, backend, or
database configuration each time.

## API Contract

- Existing `/api/*` endpoints remain unchanged.
- Existing `GET /health` remains the deployment health-check endpoint.
- Non-API browser routes serve the React application entry point in production.
- Missing static assets return `404` rather than the React entry point.

## Data Model

No schema changes. Existing Alembic migrations are applied to managed PostgreSQL
before each production release.

## Acceptance Criteria

- [ ] A production container builds successfully from a clean checkout using the
      repository's locked Python and npm dependencies.
- [ ] The container starts Uvicorn on `0.0.0.0` using the platform-provided `PORT`.
- [ ] The built React application is served by FastAPI at `/` and browser routes.
- [ ] `/api/*`, `/health`, and static asset behavior are covered by focused tests.
- [ ] A Render Blueprint defines one free Docker web service without secrets.
- [ ] Production uses `ENVIRONMENT=production` and an explicit same-origin
      `TRUSTED_ORIGINS` value.
- [ ] Alembic migrations are run manually before each deployment.
- [ ] The README documents deploy, smoke-test, observability, and rollback steps.
- [ ] Existing backend and frontend quality checks remain green.

## Test Plan

- Add focused FastAPI tests for production static-file and SPA fallback behavior.
- Build the frontend and production container locally where the required runtime is
  available.
- Inspect the final container as a non-root process and smoke-test `/health`, `/`,
  and a browser route.
- [ ] `uv run pytest`
- [ ] `uv run ruff check .`
- [ ] `uv run ruff format --check .`
- [ ] `uv run mypy`
- [ ] `uv run alembic check`
- [ ] `cd frontend && npm run typecheck`
- [ ] `cd frontend && npm run lint`
- [ ] `cd frontend && npm run format:check`
- [ ] `cd frontend && npm run test`
- [ ] `cd frontend && npm run build`
- [ ] Relevant Playwright end-to-end tests

## Security and Privacy

- Production credentials and connection strings remain Render-managed environment
  variables and are never committed.
- Frontend and API share an HTTPS origin, preserving `Secure`, `HttpOnly`,
  `SameSite=Lax` session cookies and exact-origin CSRF enforcement.
- The production image runs as an unprivileged user and excludes development tools,
  tests, local environment files, and source-control metadata.
- Database access uses a TLS-protected Neon connection string.

## Decisions and Open Questions

- Use a free Render Docker web service plus Neon free PostgreSQL, with manual
  deployment after migrations. This replaces the paid Render database and
  pre-deploy approach described elsewhere in this draft.
- Neon supplies a `postgresql://` connection string, which needs a safe conversion
  to the application's required `postgresql+psycopg://` dialect.
- Verify trusted proxy and client IP handling for authentication rate limits before
  declaring the service production-ready.
- A custom domain is optional; `TRUSTED_ORIGINS` must exactly match whichever HTTPS
  application URL is selected.

## Implementation Notes

- React 19 and Vite 8 produce static output in `frontend/dist/`.
- The lockfile currently installs FastAPI 0.141.1 and Uvicorn 0.52.4.
- Render's free service requires a manual migration step before deployment.

## Completion Notes

- Added production frontend serving, focused routing tests, a Dockerfile,
  `.dockerignore`, a free Render web-service Blueprint, and release instructions.
- Built `devstash-production:latest` and applied all seven migrations to an isolated
  PostgreSQL 18 container. HTTP checks passed for health, frontend routes, missing
  API/assets, registration, and session restoration. The runtime UID is 10001 and
  production session cookies have Secure and HttpOnly flags.
- The user also successfully applied all seven migrations to their new Neon database.
- Remaining release work: dependency advisory review, Render proxy/client-IP
  verification, full quality checks, and cloud deployment smoke tests. Status stays
  In Progress.
