# Feature: Full-Stack Application Foundation

## Status

Completed

## Summary

Establish the React and TypeScript frontend, connect it to the existing FastAPI
service, and provide the shared development and testing foundation for later
DevStash features.

## Goals

- Create a runnable React and TypeScript application under `frontend/`.
- Configure Tailwind CSS and initialize shadcn/ui as the frontend styling and
  component foundation.
- Add a minimal accessible application shell that displays the DevStash name and the
  current FastAPI health status.
- Establish a documented local development connection between the React application
  and the FastAPI API.
- Configure Vitest for frontend unit tests and Playwright for full-stack end-to-end
  tests.
- Provide consistent frontend scripts and documentation for development, building,
  testing, linting, and formatting.

## Non-Goals

- Implement item, collection, tag, search, authentication, or account features.
- Add database persistence or external service integrations.
- Build the final dashboard design or application navigation.
- Add production deployment or hosting configuration.
- Introduce global state management before a product feature requires it.

## User Story

As a developer, I want a working and tested full-stack foundation so that later
DevStash features can be built against stable frontend, API, and quality workflows.

## API Contract

### Existing `GET /health`

- Authentication: none.
- Success status: `200 OK`.
- Response content type: `application/json`.
- Response body:

```json
{"status": "ok"}
```

No new endpoint is required. The frontend must use a configurable API base URL or an
equivalent local development proxy and must handle loading, success, and unavailable
states without exposing internal errors.

## Data Model

No persistence changes.

The frontend defines a typed representation of the health response that matches the
FastAPI contract.

## Acceptance Criteria

- [x] `frontend/` contains a React application with TypeScript strict checking
  enabled and a committed dependency lockfile.
- [x] The frontend can be installed, started, built, and type-checked using documented
  commands.
- [x] Tailwind CSS is configured and used by the application shell.
- [x] shadcn/ui is initialized, and the application shell uses at least one local
  shadcn/ui component.
- [x] The root page displays the DevStash name and an accessible loading, healthy, or
  unavailable state for the FastAPI service.
- [x] The frontend can call `GET /health` during local development without browser
  cross-origin errors.
- [x] Vitest covers the health-status behavior, including success and unavailable
  responses.
- [x] Playwright starts or connects to both applications and verifies the healthy
  full-stack journey in a browser.
- [x] Frontend scripts include development, production build, type-check, unit-test,
  end-to-end-test, lint, and format-check commands.
- [x] The README documents dependency installation, separate backend and frontend
  development commands, tests, and production builds.
- [x] All existing backend tests and quality checks continue to pass.

## Test Plan

- Use Vitest to verify the health-status component's loading, healthy, and unavailable
  states with the API boundary controlled in the test.
- Use Playwright to load the application with both servers running and verify the
  DevStash heading and healthy service status.
- Verify that a production frontend build and TypeScript check succeed.
- Run the configured frontend lint and format checks.
- [x] `uv run pytest`
- [x] `uv run ruff check .`
- [x] `uv run ruff format --check .`
- [x] `uv run mypy`
- [x] Vitest frontend suite
- [x] Relevant Playwright end-to-end suite

## Security and Privacy

- Do not place secrets in frontend code, committed environment files, or browser
  responses.
- Only expose a public API base URL through frontend configuration.
- Show a stable user-facing unavailable state rather than raw network or server error
  details.
- Do not broaden backend cross-origin access beyond the origins required for local
  development if CORS is selected instead of a development proxy.

## Decisions and Open Questions

Selected project decisions:

- React with TypeScript.
- Tailwind CSS for styling.
- shadcn/ui for the component foundation.
- Vitest for frontend unit tests.
- Playwright for end-to-end tests.

- Vite for frontend development and production builds.
- npm for frontend dependencies and the committed lockfile.
- ESLint for TypeScript and React linting.
- Prettier for frontend formatting.
- A Vite development proxy for local `/api` requests to FastAPI. FastAPI CORS remains
  unchanged.

Routing and external state management are deferred until a feature requires them.

## Implementation Notes

- Keep backend source code under `src/devstash/` and frontend source code under
  `frontend/`.
- Proxy frontend `/api/*` requests to FastAPI and remove the `/api` prefix before
  forwarding so `/api/health` reaches the existing `/health` endpoint.
- Reuse the existing `GET /health` endpoint; do not expand its response solely for
  the frontend foundation.
- Add only the minimum application shell required to prove styling, components, API
  communication, and tests.

## Completion Notes

Completed on 2026-08-25.

- Added the React and TypeScript application under `frontend/` using Vite, npm,
  Tailwind CSS, and a local shadcn/ui Card component.
- Added an accessible, responsive application shell with typed FastAPI health
  integration through the Vite `/api` proxy.
- Added loading, healthy, unavailable, and retry behavior with Vitest coverage.
- Added a Playwright journey that starts or reuses FastAPI and Vite and verifies the
  connected browser experience.
- Added TypeScript, ESLint, Prettier, build, unit-test, and end-to-end-test scripts and
  documented all development workflows in the README.
- Verified pytest (1 passed), Ruff lint and format, Mypy, TypeScript, ESLint, Prettier,
  Vitest (3 passed), the Vite production build, and Playwright (1 passed).
- Visually verified desktop and mobile layouts with no browser console errors.
