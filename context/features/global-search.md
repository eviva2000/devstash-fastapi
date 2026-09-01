# Feature: Global Search / Command Palette

## Status

Completed

## Summary

Replace the top-bar search interaction with a global command palette that searches
prefetched items and the current collection catalog without a request per keystroke.

## Goals

- Open global search from the top bar or with Command+K / Control+K.
- Fuzzy-search all prefetched items and collections on the client.
- Group results into Items and Collections with useful identifying metadata.
- Support arrow-key navigation and Enter selection through the shadcn Command widget.
- Open an item drawer or navigate to the selected collection surface.

## Non-Goals

- Data-backed collections or a new collection API.
- Tag search.
- Removing the existing server-side item query, filters, pagination, or shareable
  query parameters.

## User Story

As a developer, I want to open a global palette from anywhere on the dashboard so
that I can quickly jump to a saved item or collection without leaving the keyboard.

## API Contract

No new endpoints. The palette reuses paginated `GET /api/items` requests during
dashboard load and performs no requests while the search term changes.

## Data Model

No persistence changes. Collections remain the existing dashboard catalog until the
data-backed collections feature is implemented.

## Acceptance Criteria

- [x] Command+K on macOS and Control+K elsewhere opens the palette.
- [x] Clicking the top-bar search surface opens the palette.
- [x] Item title/content and collection name fuzzy matching happen client-side.
- [x] Results are grouped under Items and Collections.
- [x] Item results show the type icon and a content preview.
- [x] Collection results show their item count.
- [x] Arrow keys move the selected result and Enter activates it.
- [x] Selecting an item opens its drawer.
- [x] Selecting a collection navigates to its existing dashboard card until a
  dedicated collection route exists.
- [x] Empty, loading, and item-data error states are clear.

## Test Plan

- Component tests for click/shortcut opening, grouped fuzzy results, empty state,
  keyboard selection, item selection, and collection selection.
- Hook/API tests for prefetching every item page once on load.
- A Playwright journey for shortcut-driven item search and selection.
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run format:check`
- [x] `npm run test`
- [x] `npm run build`
- [x] `npm run test:e2e`

## Security and Privacy

Searchable data already available to the dashboard is held in browser memory. Search
terms stay client-side and are not logged or sent to the server.

## Decisions and Open Questions

- Use shadcn Command backed by `cmdk`, which owns fuzzy scoring and keyboard result
  navigation.
- The source spec requests collection-page navigation, but this repository does not
  yet have collection routes. Selection uses a dashboard hash target as the current
  collection surface; the later data-backed collections feature can replace it.

## Implementation Notes

- Prefetch item pages with the existing `fetchItems` API function using the maximum
  supported page size.
- Preserve existing server-filtered dashboard views and their URL parameters.

## Completion Notes

- Added a shadcn-style `Command` palette backed by `cmdk`, opened from the top bar
  or the platform keyboard shortcut.
- Prefetched every item page once on dashboard load and kept fuzzy title/content and
  collection-name queries entirely in browser memory.
- Added grouped, keyboard-operable results, explicit loading/error/no-result states,
  item drawer selection, and collection-card hash navigation.
- Kept the global item cache synchronized with create, update, and delete actions
  without polluting the active server-paginated dashboard page.
- Verified 38 frontend tests, 8 Playwright journeys, 29 backend tests, frontend and
  backend static checks, formatting, type checking, and the production build.
