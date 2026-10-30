# DevStash

DevStash is a full-stack knowledge workspace for developers—a single place to
organize reusable snippets, prompts, commands, notes, links, and other technical
resources.

This repository is an incremental, teaching-focused rebuild of
[DevStash](https://github.com/eviva2000/devstash) with a FastAPI backend, a React
and TypeScript frontend, and PostgreSQL persistence. The project emphasizes
explicit feature specifications, clear architecture, automated testing, and
production-minded development practices.


## Technology stack

| Area | Technologies |
| --- | --- |
| Backend | Python 3.12+, FastAPI, Pydantic, Uvicorn |
| Persistence | PostgreSQL 18, SQLAlchemy 2.x asyncio, Psycopg 3, Alembic |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Testing | pytest, Vitest, Testing Library, Playwright |
| Quality | Ruff, strict Mypy, ESLint, Prettier |
| Tooling | uv, npm, Docker Compose |

## Authentication and ownership

DevStash supports email-and-password registration, sign-in, browser-session
restoration, and sign-out. Passwords are hashed with explicitly configured Argon2id
parameters. Authentication uses opaque server-managed sessions in `HttpOnly`,
`SameSite=Lax` cookies; only token hashes are persisted. Sessions expire after 30
minutes of inactivity or 30 days in total.

State-changing requests require a per-session CSRF token and a configured trusted
origin. PostgreSQL-backed fixed-window rate limits protect registration (10 requests
per source IP per hour) and failed sign-in attempts (5 per account or source IP per
15 minutes), with atomic enforcement under concurrent requests. Authentication
errors do not reveal whether an account exists.

Every `/api/items` operation requires authentication. Item creation, listing,
search, filtering, retrieval, updates, and deletion are scoped to the authenticated
owner in PostgreSQL; another user's item returns the same `404` response as an
unknown item.

## Project structure

```text
.
├── context/                  # project guidance and feature specs
├── docker/postgres/          # local database initialization
├── frontend/                 # React, Vite, Tailwind CSS, and shadcn/ui
│   ├── e2e/                  # Playwright tests
│   └── src/                  # frontend source and Vitest tests
├── migrations/               # Alembic environment and revisions
├── src/devstash/
│   ├── api/                  # FastAPI route modules
│   ├── core/                 # settings and persistence infrastructure
│   ├── models/               # SQLAlchemy persistence models
│   ├── repositories/         # database access boundaries
│   ├── schemas/              # Pydantic API contracts
│   ├── services/             # application workflows and transactions
│   ├── __init__.py
│   └── main.py
├── tests/                    # unit, API, and PostgreSQL integration tests
├── exercises/
│   └── 01_health_endpoint.md
├── alembic.ini
├── compose.yaml
├── pyproject.toml
└── uv.lock
```

Backend application code lives under `src/`, backend tests live under `tests/`, and
the frontend is isolated under `frontend/` with its own dependencies and commands.

## Setup

### Free deployment (Render and Neon)

The repository includes a Docker image and a Render Blueprint for a small,
same-origin deployment. Render's free web service sleeps after inactivity; Neon
also scales its database to zero. Expect cold starts and free-tier usage limits.
These services are intended for low-traffic projects, not guaranteed availability.

1. Create a Neon free PostgreSQL project. Keep the connection string private and
   use TLS with certificate verification, such as `sslmode=verify-full` and
   `sslrootcert=system` where supported by your PostgreSQL client.
2. Create a Render Blueprint from this repository and select the deployment branch.
   Configure `DATABASE_URL` using the Neon connection string, replacing only its
   `postgresql://` prefix with `postgresql+psycopg://`. Configure
   `TRUSTED_ORIGINS` as a JSON array containing the exact HTTPS Render URL, for
   example `["https://your-service.onrender.com"]`. Do not commit either value.
3. Before the first deployment, and before deploying each new revision, run
   `uv run alembic upgrade head` locally with `DATABASE_URL` set to the Neon URL
   using the same Psycopg prefix. Check the targeted database carefully first.
   Do not put credentials into shell history or commit them to the repository.
4. Deploy the reviewed revision manually in Render. Automatic deploys are disabled
   because free web services do not support pre-deploy migration commands. For
   schema changes, verify compatibility with the currently running version before
   migrating; take a backup first. An application rollback does not undo a migration.
5. Verify `/health`, registration, sign-in, a page refresh on `/dashboard`, and
   item creation. Check Render logs and Neon usage. Test that rate limiting uses
   actual client IPs behind Render's proxy before opening registration publicly.

If a release fails, redeploy the last working revision in Render and verify the
application and logs. Review database migration compatibility separately before
any downgrade. Free plans have limits and policies that can change; independently
back up important data and review provider usage and billing settings.

See [Render free services](https://render.com/docs/free),
[Render deployment commands](https://render.com/docs/deploys), and
[Neon connection guidance](https://neon.com/docs/connect/connect-from-any-app).

Requirements:

- Python 3.12 or later
- uv
- Node.js 20.19 or later
- npm
- Docker Desktop or another Docker Compose-compatible runtime

Install backend dependencies from the repository root:

```bash
uv sync
```

Create the local settings file, start PostgreSQL 18, and apply migrations:

```bash
cp .env.example .env
docker compose up -d postgres
docker compose ps
uv run alembic upgrade head
```

The values in `.env.example` are local-only teaching credentials. Use distinct,
secret credentials in every deployed environment and never commit `.env`.

Install frontend dependencies and Playwright's Chromium browser:

```bash
cd frontend
npm install
npx playwright install chromium
```

## Run the backend

Ensure PostgreSQL is running and current before starting FastAPI:

```bash
docker compose up -d postgres
uv run alembic upgrade head
```

Then start FastAPI from the repository root:

```bash
uv run uvicorn devstash.main:app --app-dir src --reload
```

The backend is now available at <http://127.0.0.1:8000>. Use `Ctrl+C` to stop it.

## Frontend development

In another terminal, start Vite:

```bash
cd frontend
npm run dev
```

Then visit:

- Web application: <http://127.0.0.1:5173>
- Health endpoint: <http://127.0.0.1:8000/health>
- Interactive API docs: <http://127.0.0.1:8000/docs>

Vite proxies `/api/*` and `/health` to FastAPI without rewriting either path during
development. Product requests therefore use the same canonical `/api` routes in the
browser, FastAPI's OpenAPI schema, tests, and a future production deployment.

The PostgreSQL data is stored in the `devstash_postgres_data` Docker volume and
survives container restarts. Stop the service without deleting its data using:

```bash
docker compose stop postgres
```

`docker compose down --volumes` permanently deletes the local database volume; use
it only when you intentionally want a fresh local database.

## Database migrations

All commands run from the repository root and read `DATABASE_URL` through the same
typed settings layer as the application.

```bash
# Create a candidate migration from SQLAlchemy metadata.
uv run alembic revision --autogenerate -m "describe the schema change"

# Apply all migrations, inspect state and history, or revert one revision.
uv run alembic upgrade head
uv run alembic current
uv run alembic history
uv run alembic downgrade -1

# Fail if model metadata and the migration head differ.
uv run alembic check
```

Review every generated migration before applying or committing it. Every repository
migration must implement both `upgrade()` and `downgrade()`.

## Backend quality checks

```bash
uv run pytest
uv run ruff check .
uv run ruff format --check .
uv run mypy
uv run alembic check
```

Start the Compose PostgreSQL service before running pytest or `alembic check`.
Pytest creates one uniquely named `devstash_test_*` database and removes it after the
suite, leaving the development database untouched. For a non-default local server,
set `TEST_DATABASE_URL` for the application role and `TEST_DATABASE_ADMIN_URL` for a
role allowed to create and drop those disposable test databases.

To let Ruff format the code instead of only checking it:

```bash
uv run ruff format .
```

## Frontend quality checks

Run these commands from `frontend/`:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
npm run test:e2e
```

The Playwright command starts both FastAPI and Vite automatically when they are not
already running.

To run frontend unit tests in watch mode or format the frontend:

```bash
npm run test:watch
npm run format
```

## Production build

Build the React frontend from `frontend/`:

```bash
npm run build
```

The static production output is written to `frontend/dist/`. Production hosting is
not configured yet.

## Current API

The process-level liveness endpoint remains outside the product API namespace:

```http
GET /health
```

```json
{"status":"ok"}
```

Database availability is intentionally excluded from this response. Product APIs
for account sessions are available at:

```http
POST   /api/users
POST   /api/sessions
GET    /api/session
DELETE /api/session
```

Authenticated APIs for snippets, prompts, commands, and notes are available at:

```http
POST   /api/items
GET    /api/items
GET    /api/items/{id}
PATCH  /api/items/{id}
DELETE /api/items/{id}
```

Request and response schemas are documented in the interactive OpenAPI UI at
<http://127.0.0.1:8000/docs>.
