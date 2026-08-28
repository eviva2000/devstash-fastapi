# Feature: Search and Filtering

## Status

Completed

## Summary

Make saved items retrievable through title/content search, type and language filters,
URL-backed view state, and server-side pagination.

## Goals

- Search item titles and content.
- Filter results by item type and language.
- Provide clear empty-stash and no-results states.
- Keep search and filter state in shareable URL query parameters.
- Add server-side pagination and a PostgreSQL search index.

## Non-Goals

- Tags, tag filtering, or tag search.
- Data-backed collections or collection membership.
- Changes to item creation, editing, or deletion workflows.

## User Story

As a developer with a growing stash, I want to search and filter my items so that I
can quickly recover useful knowledge and share a specific view.

## API Contract

`GET /api/items` accepts optional `q`, `item_type`, `language`, `page`, and
`page_size` query parameters. It returns `{ items, page, page_size, total }`.
Results are updated-most-recent first. Invalid pagination values receive FastAPI
validation errors.

## Data Model

Add a PostgreSQL GIN index on a generated full-text search vector composed of title
and content.

## Acceptance Criteria

- [x] A case-insensitive title or content query returns matching items only.
- [x] Item type and language filters can be combined with a query.
- [x] The API returns deterministic, server-paginated results with total metadata.
- [x] PostgreSQL has a GIN-backed title/content search index.
- [x] The dashboard search field and filter controls update URL query parameters.
- [x] Browser back/forward restores a searched or filtered view.
- [x] An empty stash and a no-results view give distinct, helpful next actions.

## Test Plan

- API integration tests for matching, filters, pagination, and response metadata.
- Frontend API and dashboard tests for serialized parameters, URL state, filters,
  pagination, and distinct empty states.
- [x] `uv run pytest`
- [x] `uv run ruff check .`
- [x] `uv run ruff format --check .`
- [x] `uv run mypy`
- [x] `npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build`
- [x] Relevant Playwright end-to-end tests.

## Security and Privacy

Search terms are bound query parameters. No authentication exists yet; this feature
does not change data visibility.

## Decisions and Open Questions

- Use PostgreSQL web-search text search rather than adding a new external search
  service.
- A fixed, modest page size is used in the dashboard; the API bounds client values.

## Implementation Notes

- Tags and data-backed collections are intentionally deferred to their own features.

## Completion Notes

- Added PostgreSQL full-text title/content search through a generated `tsvector`
  column and GIN index.
- Added typed, filtered, server-paginated item listings and URL-backed dashboard
  search, type/language filters, and result pagination.
- Verified with backend tests and static checks, frontend tests/build, and Playwright.
