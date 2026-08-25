# Feature: Health Endpoint

## Status

Completed

## Summary

Provide a lightweight endpoint that confirms the DevStash API process can receive
and answer HTTP requests.

## Goals

- Expose a stable health-check route for developers and infrastructure.
- Return a typed JSON response.

## Non-Goals

- Check database or external-service health.
- Report build, host, or environment details.
- Act as a full readiness or diagnostics endpoint.

## User Story

As a developer or monitoring system, I want to call a health endpoint so that I can
confirm the API process is responding.

## API Contract

### `GET /health`

- Authentication: none.
- Success status: `200 OK`.
- Response content type: `application/json`.
- Response body:

```json
{"status": "ok"}
```

## Data Model

No persistence changes. The response uses the Pydantic `HealthResponse` model with
`status` restricted to the literal value `"ok"`.

## Acceptance Criteria

- [x] `GET /health` returns `200 OK`.
- [x] The response body is exactly `{"status": "ok"}`.
- [x] The response is JSON.
- [x] The route declares a typed response model.
- [x] The endpoint is covered by an automated test.

## Test Plan

- Exercise the endpoint through FastAPI's `TestClient`.
- Assert the status code, complete JSON body, and content type.
- [x] `uv run pytest`
- [x] `uv run ruff check .`
- [x] `uv run ruff format --check .`
- [x] `uv run mypy`

## Security and Privacy

The endpoint is public and returns no environment, dependency, or user information.

## Decisions and Open Questions

- The endpoint reports process health only. Dependency readiness can be specified as
  a separate feature if it becomes necessary.

## Implementation Notes

- Application and route: `src/devstash/main.py`.
- Test: `tests/test_health.py`.

## Completion Notes

Delivered as part of the initial project setup.

