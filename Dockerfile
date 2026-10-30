FROM node:22-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM ghcr.io/astral-sh/uv:0.9.28 AS uv

FROM python:3.12-slim AS runtime
COPY --from=uv /uv /usr/local/bin/uv
WORKDIR /app
ENV UV_PROJECT_ENVIRONMENT=/app/.venv UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy PATH="/app/.venv/bin:$PATH" PYTHONPATH=/app/src
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --locked --no-dev --no-install-project
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY alembic.ini ./
COPY --from=frontend /build/frontend/dist/ ./src/devstash/static/
RUN useradd --create-home --uid 10001 appuser
USER appuser
CMD ["sh", "-c", "exec uvicorn devstash.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
