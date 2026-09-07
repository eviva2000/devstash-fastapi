# Feature: Sidebar Live Data

## Status

Completed

## Summary

Sync the item-type and collection sections in the authenticated dashboard sidebar
with the current user's real data instead of runtime values from
`frontend/src/lib/mock-data.ts`. Sidebar counts and entries stay current as items or
collections change during the session.

## Goals

- Replace the sidebar's mock item-type catalog and counts with values derived from
  authenticated, owner-scoped item data.
- Keep the sidebar collection list sourced from the authenticated collection service
  and remove any remaining runtime dependency on mock collection data.
- Update sidebar item-type counts immediately after successful item creation,
  type changes, and deletion without requiring a full-page reload.
- Update sidebar collection entries immediately after successful collection creation
  while preserving the established ordering and display limits.
- Represent loading, failure, and empty states without displaying invented counts or
  stale mock records.

## Non-Goals

- Adding new item types beyond the persisted `snippet`, `prompt`, `command`, and
  `note` types.
- Implementing collection membership, per-collection item counts, collection
  favorites, editing, deletion, or reordering.
- Changing item or collection ownership rules.
- Redesigning the sidebar or adding new navigation destinations.
- Changing the public landing page's static explanation of supported resource types.

## User Story

As an authenticated developer, I want the sidebar to reflect my actual items and
collections so that its navigation and counts match the data in my workspace.

## API Contract

The existing authenticated item and collection API contracts remain the source of
truth:

- `GET /api/items` supplies owner-scoped item data and totals.
- `GET /api/collections` supplies owner-scoped collections in newest-first order.
- Existing create, update, and delete responses drive immediate client-side updates.
- Requests without a valid session continue to return `401 Unauthorized` through
  the existing authentication behavior.

Item-type totals are derived from the existing complete, owner-scoped client item
state. No API changes are required.

## Data Model

No persistence changes are expected. The feature reads existing owner-scoped items
and collections; collection membership remains unavailable.

## Acceptance Criteria

- [x] The authenticated dashboard sidebar does not import item types, item counts,
      or collections from `frontend/src/lib/mock-data.ts`.
- [x] The sidebar displays only the four item types currently supported by the item
      API: Snippets, Prompts, Commands, and Notes.
- [x] Each item-type count equals the number of items of that type owned by the
      authenticated user, including when the main item list is filtered or paged.
- [x] One user's sidebar counts and collections never include another user's data.
- [x] Successful item creation increments the correct type count immediately.
- [x] Changing an item's type updates both affected counts immediately.
- [x] Successful item deletion decrements the correct type count immediately.
- [x] Successful collection creation adds the collection to the sidebar immediately
      and preserves newest-first ordering and the existing recent display limit.
- [x] Reloading the dashboard reconstructs the same sidebar values from server data.
- [x] Loading and request failures do not fall back to mock counts or mock
      collections and are communicated accessibly where user action is required.
- [x] Unsupported future types such as files, images, and links are not presented as
      populated sidebar categories until their persistence is implemented.

## Test Plan

- Backend repository/API tests if an aggregate item-type count response is added,
  including owner isolation, zero counts, and all supported item types.
- Frontend tests proving sidebar values are built from authenticated item and
  collection state rather than mock exports.
- Frontend component tests for initial counts and collection ordering, loading and
  failure behavior, and immediate synchronization after item create, type change,
  delete, and collection create operations.
- Playwright journey that signs in, creates items of multiple types and a collection,
  edits an item type, deletes an item, reloads, and verifies the sidebar throughout.
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

- Compute or return counts only from records scoped to the authenticated owner.
- Never accept an owner ID from the browser or expose ownership fields in responses.
- Preserve existing session, request validation, CSRF, and non-sensitive error
  behavior.
- Treat item and collection names as untrusted text and render them through React
  text nodes.

## Decisions and Open Questions

- Item-type totals are computed from the existing complete client item state, which
  is loaded from the owner-scoped item API and synchronized after successful item
  mutations. This avoids a duplicate aggregate endpoint while remaining independent
  of visible list filters and pagination.
- “Collection data” means the real collection entries currently available from the
  collection API. Real per-collection item counts and type badges cannot be supplied
  until collection membership is implemented and therefore remain out of scope.
- The authenticated sidebar should stop showing Files, Images, and Links because
  those types are not currently persisted. The public landing page remains a product
  roadmap surface and is not affected.

## Implementation Notes

- Reuse the existing shared item and collection state so successful mutations update
  all consumers consistently.
- Keep the desktop and mobile sidebar variants on the same data contract.
- Preserve the current item-type labels, icons, colors, collection ordering, and
  recent collection limit where they apply to supported real data.
- Remove runtime sidebar dependencies on `frontend/src/lib/mock-data.ts`; test
  fixtures may use explicit local data but should not conceal a production import.

## Completion Notes

- Replaced the authenticated sidebar's mock resource catalog with the four persisted
  item types and counts derived from the complete owner-scoped item state.
- Kept desktop and mobile sidebar counts synchronized immediately after item create,
  type update, and deletion operations, with accessible unavailable states during
  loading or failure.
- Confirmed collection creation remains server-backed, immediately synchronized,
  newest-first, display-limited, and persistent across reloads.
- Verified with 68 backend tests, 56 frontend unit tests, 12 Playwright journeys,
  backend and frontend static analysis, formatting checks, migration validation, and
  a production frontend build.
