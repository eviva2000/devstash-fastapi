# DevStash

DevStash is a full-stack knowledge workspace for developers—a single place to
organize reusable snippets, prompts, commands, notes, links, and other technical
resources.

This repository is an incremental, teaching-focused rebuild of DevStash with a
FastAPI backend, a React and TypeScript frontend, and PostgreSQL persistence. The
project emphasizes explicit feature specifications, clear architecture, automated
testing, and production-minded development practices.


## Technology stack

| Area | Technologies |
| --- | --- |
| Backend | Python 3.12+, FastAPI, Pydantic, Uvicorn |
| Persistence | PostgreSQL 18, SQLAlchemy 2.x asyncio, Psycopg 3, Alembic |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Testing | pytest, Vitest, Testing Library, Playwright |
| Quality | Ruff, strict Mypy, ESLint, Prettier |
| Tooling | uv, npm, Docker Compose |

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
│   ├── core/                 # settings and persistence infrastructure
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

## Development

Ensure PostgreSQL is running and current before starting FastAPI:

```bash
docker compose up -d postgres
uv run alembic upgrade head
```

Then start FastAPI from the repository root:

```bash
uv run uvicorn devstash.main:app --app-dir src --reload
```

In another terminal, start Vite:

```bash
cd frontend
npm run dev
```

Then visit:

- Web application: <http://127.0.0.1:5173>
- Health endpoint: <http://127.0.0.1:8000/health>
- Interactive API docs: <http://127.0.0.1:8000/docs>

Vite proxies `/api/*` to FastAPI during development, so the frontend can request
`/api/health` without broadening the API's CORS policy.

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

The public API currently exposes one process-level liveness endpoint:

```http
GET /health
```

```json
{"status":"ok"}
```

Database availability is intentionally excluded from this response. Product APIs
will be introduced through their own feature specifications as domain work begins.
