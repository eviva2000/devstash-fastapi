# DevStash

A teaching-focused full-stack rebuild of DevStash using a Python and FastAPI backend
with a React and TypeScript frontend.

## Project structure

```text
.
├── context/                  # project guidance and feature specs
├── frontend/                 # React, Vite, Tailwind CSS, and shadcn/ui
│   ├── e2e/                  # Playwright tests
│   └── src/                  # frontend source and Vitest tests
├── src/devstash/
│   ├── __init__.py
│   └── main.py
├── tests/
│   └── test_health.py
├── exercises/
│   └── 01_health_endpoint.md
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

Install backend dependencies from the repository root:

```bash
uv sync
```

Install frontend dependencies and Playwright's Chromium browser:

```bash
cd frontend
npm install
npx playwright install chromium
```

## Development

Start FastAPI from the repository root:

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

## Backend quality checks

```bash
uv run pytest
uv run ruff check .
uv run ruff format --check .
uv run mypy
```

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

## What the first endpoint teaches

`app = FastAPI(...)` creates the ASGI web application. The `@app.get` decorator
connects an HTTP `GET /health` request to the `health_check` Python function.
The return annotation and `response_model` describe and validate the JSON response.

The function is `async` because FastAPI supports asynchronous request handlers.
There is no awaited I/O yet, but later endpoints can await database or network work
without blocking the server worker.
