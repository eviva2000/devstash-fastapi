# Feature: Collection Creation

## Status

Completed

## Summary

Replace the dashboard's mock collection catalog with authenticated, user-scoped
collection data and let a developer create a named collection with a description
from an accessible top-bar modal. A successful save updates every collection-backed
surface immediately and reports the outcome with a toast.

## Goals

- Persist collections in PostgreSQL and scope every collection read and create to
  the authenticated owner.
- Provide typed server-side collection access and authenticated HTTP endpoints for
  collection listing and creation, following the existing item boundaries.
- Load collection data from the server instead of importing the mock collection
  catalog into user-facing dashboard surfaces.
- Add a top-bar button that opens an accessible modal for collection name and
  description.
- Validate and save the form through the collection API, show an accessible success
  or failure toast, and prevent duplicate submissions while saving.
- Add the created collection to every collection-backed client surface without a
  full-page reload.

## Non-Goals

- Editing, deleting, favoriting, or reordering collections.
- Adding or removing items from collections.
- Dedicated collection detail pages or collection-specific item filtering.
- Tag persistence or tag management.
- Introducing Next.js, Server Components, or a parallel database-access layer.

## User Story

As an authenticated developer, I want to create a collection with a name and
description so that I can begin organizing related DevStash items.

## API Contract

### `GET /api/collections`

- Requires an authenticated session.
- Returns only collections owned by the current user, ordered by `created_at`
  descending with `id` descending as a deterministic tie-breaker.
- Returns `200 OK` with a JSON array of collection responses.
- Returns `401 Unauthorized` when no valid session exists.

### `POST /api/collections`

- Requires an authenticated session and the existing CSRF protection used by item
  mutations.
- Accepts JSON with `name` and `description`; extra fields are rejected.
- Trims the name, rejects blank values, and validates documented maximum lengths.
- Returns `201 Created`, a `Location` header, and the created collection response.
- Returns `401 Unauthorized` without a valid session, `403 Forbidden` for failed
  CSRF validation, and `422 Unprocessable Entity` for invalid input.

### Collection response

- Includes `id`, `name`, `description`, `created_at`, and `updated_at`.
- Includes the collection-card values needed by current consumers: an initial item
  count of `0`, an initial favorite state of `false`, and an empty item-type list.
- Never exposes `owner_id`.

## Data Model

- Add a `collections` table with UUID `id`, UUID `owner_id`, name, description,
  `created_at`, and `updated_at`.
- `owner_id` references `users.id`, is required, and is indexed with the ordering
  columns used by the owner-scoped list query.
- Database constraints reject blank names and enforce the same length bounds as the
  API schema.
- New collections have no item memberships and are not favorites. Membership and
  favorite persistence remain outside this feature.
- Add a reviewed Alembic migration with upgrade and downgrade paths.

## Acceptance Criteria

- [x] An authenticated user's dashboard collection data comes from the collection
      service rather than `frontend/src/lib/mock-data.ts`.
- [x] Collection list and create queries always include the authenticated user's ID
      at the repository boundary.
- [x] One user cannot see collections created by another user.
- [x] The dashboard top bar has a keyboard-accessible “New collection” button.
- [x] Activating the button opens a shadcn-style modal with labeled Name and
      Description fields, Cancel, and Create collection actions.
- [x] Name and description validation is shown accessibly and invalid forms are not
      submitted.
- [x] While creation is in progress, duplicate submission is prevented and the
      modal actions communicate their disabled state.
- [x] A successful response closes the modal, shows an accessible success toast,
      and makes the new collection available immediately to the recent collection
      grid, sidebar lists, collection statistics, and global search as applicable.
- [x] Recent collection surfaces continue to apply their existing display limits
      while using newest-first server data.
- [x] A failed response keeps the user's form values available for retry and shows
      an accessible failure toast without adding a collection.
- [x] The API returns the documented status codes, validation errors, response
      shape, and `Location` header.
- [x] Collection ownership is never accepted from the client or exposed in API
      responses.

## Test Plan

- Backend schema tests for trimmed non-blank names, length limits, descriptions,
  forbidden extra fields, and response serialization.
- Repository/service tests proving newest-first ordering and owner-scoped listing
  and creation.
- API tests for successful list/create, empty list, authentication, CSRF,
  validation, ownership isolation, response shape, and `Location`.
- Migration checks for upgrade/downgrade structure and ownership indexes and
  constraints.
- Frontend API tests for valid parsing, authenticated list/create calls, CSRF
  headers, and stable transport/invalid-response errors.
- Vitest component tests for opening and cancelling the modal, accessible labels,
  validation, disabled saving state, success and failure toasts, retry-preserved
  values, and immediate updates across collection consumers.
- Playwright journey: sign in, create a collection, observe the success toast and
  updated dashboard surfaces, reload, and confirm persistence.
- [x] `uv run pytest`
- [x] `uv run ruff check .`
- [x] `uv run ruff format --check .`
- [x] `uv run mypy`
- [x] `uv run alembic check`
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run format:check`
- [x] `npm run test`
- [x] `npm run build`
- [x] `npm run test:e2e`

## Security and Privacy

- Derive `owner_id` only from the authenticated server session; never accept it in
  request bodies.
- Enforce owner scoping in repository queries so route or service callers cannot
  accidentally return another user's collections.
- Apply the established session, CSRF, request-size, and non-sensitive error-message
  patterns used for item creation.
- Treat collection names and descriptions as untrusted text and render them through
  React text nodes without unsafe HTML.
- Do not log collection descriptions or ownership data beyond what is required for
  operational diagnostics.

## Decisions and Open Questions

- The previous-project references to Server Components and `lib/db` are intentionally
  adapted to this repository's selected stack: React/Vite uses a typed frontend API
  module, while FastAPI routes call services and owner-scoped repositories backed by
  PostgreSQL.
- Collection names are required and limited to 200 characters. Descriptions are
  required and limited to 2,000 characters, matching the existing concise-title and
  long-text conventions.
- Collection names are not required to be unique per user.
- Card accents are presentation details derived deterministically in the frontend
  and are not persisted as user data.
- Use the smallest accessible project-owned shadcn-style toast primitive; do not add
  an unrelated UI system.

## Implementation Notes

- Follow the established item architecture: SQLAlchemy model, Pydantic schemas,
  owner-scoped repository, transaction-owning service, FastAPI router, typed
  frontend API boundary, React state hook, and presentational components.
- Replace direct mock collection imports in the dashboard, sidebar, statistics, and
  global search with one shared server-backed collection state so a successful
  create updates all consumers consistently.
- Preserve the dashboard's current three-card recent collection limit and the
  sidebar's existing recent/favorite grouping behavior.

## Completion Notes

Delivered owner-scoped PostgreSQL collection persistence, authenticated list/create
endpoints with CSRF protection, strict request validation, and a reviewed Alembic
migration. The React dashboard now reads one shared collection state, supports an
accessible create dialog with validation and toast feedback, and immediately updates
the recent grid, sidebar, statistics, and global search after creation.

Verified on 2026-09-07: 68 backend tests, Ruff lint/format, Mypy, Alembic drift
check, 54 Vitest tests, frontend type/lint/format/build checks, and 11 Playwright
end-to-end tests all passed.
