# DevStash FastAPI

A teaching-focused rebuild of DevStash using Python and FastAPI.

## Project structure

```text
.
├── src/devstash/
│   ├── __init__.py
│   └── main.py
├── tests/
│   └── test_health.py
├── exercises/
│   └── 01_health_endpoint.md
└── pyproject.toml
```

Application code lives under `src/`, while tests live separately under `tests/`.
This prevents tests from accidentally importing code from the repository root
instead of the installed application package.

## Setup

Install the application and development dependencies:

```bash
uv sync
```

Start the development server with automatic reload:

```bash
uv run uvicorn devstash.main:app --app-dir src --reload
```

Then visit:

- Health endpoint: <http://127.0.0.1:8000/health>
- Interactive API docs: <http://127.0.0.1:8000/docs>

## Quality checks

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

## What the first endpoint teaches

`app = FastAPI(...)` creates the ASGI web application. The `@app.get` decorator
connects an HTTP `GET /health` request to the `health_check` Python function.
The return annotation and `response_model` describe and validate the JSON response.

The function is `async` because FastAPI supports asynchronous request handlers.
There is no awaited I/O yet, but later endpoints can await database or network work
without blocking the server worker.

