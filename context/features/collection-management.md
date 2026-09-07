# Feature: Collection Management

## Status

Completed

## Summary

Open a collection details drawer when an authenticated user selects a dashboard
collection card. The drawer lets the owner edit the collection name and description
or delete the collection after confirming through a shadcn AlertDialog.

## Goals

- Make each dashboard collection card open an accessible collection drawer.
- Let the authenticated owner edit and persist a collection's name and description.
- Let the authenticated owner delete a collection only after explicit confirmation
  in a shadcn AlertDialog.
- Synchronize successful edits and deletions across every collection-backed dashboard
  surface without a full-page reload.
- Let the owner add existing items to or remove items from an open collection drawer.
- Provide clear saving, deletion, validation, success, and failure feedback.

## Non-Goals

- Editing collection favorites, accents, item counts, or item-type badges.
- Bulk editing or deleting collections.
- Adding collection routes or standalone collection pages.
- Redesigning collection cards, the dashboard, or the existing collection creation
  workflow.

## User Story

As an authenticated developer, I want to open a collection and edit or delete it so
that I can keep my collection catalog accurate from the dashboard.

## API Contract

### `PATCH /api/collections/{collection_id}`

- Requires the existing authenticated session and CSRF protection.
- Accepts JSON with `name` and `description`, using the same trimming, required-field,
  and length rules as collection creation.
- Returns the updated canonical collection response with `200 OK`.
- Returns `401 Unauthorized` without a valid session, `403 Forbidden` for invalid or
  missing CSRF protection, `404 Not Found` when the collection is absent or owned by
  another user, and `422 Unprocessable Entity` for invalid input.

### `DELETE /api/collections/{collection_id}`

- Requires the existing authenticated session and CSRF protection.
- Deletes only a collection owned by the authenticated user.
- Returns `204 No Content` on success.
- Returns `401 Unauthorized` without a valid session, `403 Forbidden` for invalid or
  missing CSRF protection, and `404 Not Found` when the collection is absent or owned
  by another user.

The existing list/create contracts and canonical collection response remain
compatible and add `item_ids`, while `item_count` and `types` reflect persisted
membership.

### `PUT /api/collections/{collection_id}/items/{item_id}`

- Requires the existing authenticated session and CSRF protection.
- Adds the owner's item to the owner's collection and returns the updated canonical
  collection response with `200 OK`.
- Repeating the request is idempotent.
- Returns `404 Not Found` when either resource is absent or not owned by the user.

### `DELETE /api/collections/{collection_id}/items/{item_id}`

- Requires the existing authenticated session and CSRF protection.
- Removes the item membership and returns the updated canonical collection response
  with `200 OK`.
- Repeating the request is idempotent when both owned resources exist.
- Returns `404 Not Found` when either resource is absent or not owned by the user.

## Data Model

Add a many-to-many association table between collections and items with a composite
primary key and cascading foreign keys. Updates modify the existing `name`,
`description`, and `updated_at` values; deleting either parent removes its membership
rows. Item ownership remains on the existing parent records.

## Acceptance Criteria

- [x] Clicking a dashboard collection card opens a right-side drawer identified by
      the collection name and populated with its current name and description.
- [x] The drawer supports keyboard interaction, traps focus while open, closes with
      Escape or its close control, and restores focus to the triggering card.
- [x] The owner can enter edit mode, change the name and description, and save using
      the same validation constraints as collection creation.
- [x] A successful edit immediately updates the drawer, dashboard cards, sidebar,
      collection count surfaces, and global search results without a page reload.
- [x] Edit submission is disabled while saving and failures preserve the user's input
      while showing accessible error feedback.
- [x] Selecting Delete opens a shadcn AlertDialog that names the collection and
      explains that deletion is permanent.
- [x] Cancelling the confirmation leaves the collection and drawer unchanged and
      returns focus appropriately.
- [x] Confirming deletion disables duplicate submissions, deletes the collection,
      closes the confirmation and drawer, restores focus sensibly, and immediately
      removes the collection from all collection-backed surfaces.
- [x] Delete failures keep the collection available and communicate an accessible,
      non-sensitive error.
- [x] Reloading after an edit or deletion reflects the persisted server state.
- [x] A user cannot update or delete another user's collection, and non-owned IDs are
      not disclosed through distinct error behavior.
- [x] Direct API requests enforce authentication, CSRF protection, validation, and
      owner scoping.
- [x] Read mode lists only the items currently in the selected collection and shows
      a clear empty state when it has no members.
- [x] Edit mode provides a shadcn Select containing the owner's items that are not
      already members, and lets the user remove current members.
- [x] Adding or removing an item persists immediately, prevents duplicate
      submissions, and updates the collection's item count and type badges everywhere
      without reloading.
- [x] Membership failures preserve the previous state and show accessible,
      non-sensitive feedback.
- [x] A user cannot add another user's item to a collection or change another user's
      collection membership.

## Test Plan

- Backend repository, service, and API tests for successful update/delete, persisted
  results, validation, missing records, owner isolation, authentication, and CSRF.
- Frontend API tests for PATCH/DELETE request contracts, response validation, and
  error handling, plus add/remove membership requests.
- Hook/component tests for drawer open/close and focus behavior, edit validation,
  pending/error states, confirmation cancellation, and synchronized update/delete.
- Playwright journey that creates a collection, opens its card, edits it, reloads,
  deletes it through the confirmation dialog, reloads again, and verifies all
  collection surfaces.
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

- Resolve update and deletion targets through owner-scoped repository queries; never
  trust an owner identifier from the browser.
- Use the same `404 Not Found` response for absent and non-owned collections to avoid
  revealing another user's records.
- Preserve existing session and CSRF protections for both mutating endpoints.
- Render collection names and descriptions as untrusted text and return only stable,
  non-sensitive errors to the browser.

## Decisions and Open Questions

- The drawer opens from dashboard collection cards. Existing sidebar and global
  search selection behavior remains navigation/scroll behavior unless expanded by a
  later feature.
- Both name and description remain required and retain the current 200- and
  2,000-character limits used for creation.
- Deletion is permanent and requires an explicit shadcn AlertDialog confirmation;
  undo/soft deletion is out of scope.
- Read mode shows only current members. Edit mode uses a shadcn Select backed by the
  already-prefetched owner-scoped item catalog, excluding current members;
  membership mutations use idempotent nested-resource endpoints and return the
  updated collection.

## Implementation Notes

- Reuse the established item drawer and alert-dialog interaction patterns where they
  fit, while keeping collection API access in the collection state hook rather than
  the presentational drawer.
- Extend the existing repository/service/API layers instead of placing persistence
  logic in route handlers.
- Update the shared collection state by collection ID so cards, sidebar, statistics,
  and global search stay consistent.
- Persist membership in a migration-backed association table and derive collection
  `item_ids`, `item_count`, and distinct item `types` from it.

## Completion Notes

- Added an accessible collection drawer with name and description editing plus
  deletion guarded by a shadcn AlertDialog.
- Added persisted many-to-many collection membership: read mode shows current
  members, while edit mode can remove members or add eligible owned items through a
  shadcn Select.
- Added owner-scoped, CSRF-protected collection and membership mutations with
  synchronized dashboard state.
- Verified 78 backend tests, 59 frontend tests, 12 Playwright tests, and all lint,
  formatting, type-check, build, and migration gates.
