# Current Feature: Full-Stack Application Foundation

## Status

Completed

## Active Spec

[Full-Stack Application Foundation](features/application-foundation.md)

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

## Notes

- Selected Vite, npm, ESLint, Prettier, and a Vite `/api` development proxy.
- The linked spec is the source of truth; goals here are its working copy.
- Allowed statuses are `Not Started`, `In Progress`, `Blocked`, and `Completed`.

## History

- [Health Endpoint](features/health-endpoint.md) - Initial `GET /health` endpoint
  returning `{"status": "ok"}`.
- [Full-Stack Application Foundation](features/application-foundation.md) - React and
  TypeScript frontend with Vite, Tailwind CSS, shadcn/ui, FastAPI health integration,
  Vitest, and Playwright (Completed).
