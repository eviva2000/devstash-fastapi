# Feature: Dashboard UI

## Status

Completed

## Summary

Create the responsive, dark-mode DevStash dashboard shell shown in the supplied references using typed local mock data.

## Goals

- Add a `/dashboard` route with a dark dashboard layout, display-only search, and action controls.
- Build a responsive sidebar with types, favorite/recent collections, and a user area.
- Display four stats cards, recent collections, and at most six recent items from local mock data.
- Provide an accessible collapsible desktop sidebar and modal mobile drawer.

## Non-Goals

- Implement CRUD, database/API behavior, authentication, search, or real collection/item actions.
- Build the detail drawer shown in one reference screenshot.

## User Story

As a developer, I want a polished dashboard overview so that I can see how my developer knowledge will be organized before data features are implemented.

## API Contract

Not applicable. The existing health API remains unchanged.

## Data Model

No database changes. Typed frontend mock data supplies the dashboard content.

## Acceptance Criteria

- [x] `/dashboard` renders the dark DevStash dashboard with display-only search, New Collection, and New Item controls.
- [x] Desktop navigation lists types, favorite collections, recent collections, and a user area using mock data.
- [x] The desktop sidebar collapses and expands with an accessible control.
- [x] The desktop sidebar remains fixed to the viewport while dashboard content
  scrolls vertically.
- [x] Mobile navigation opens as an accessible modal drawer and closes through its control, Escape, or overlay.
- [x] The main dashboard renders four stats cards, collection cards, no pinned-items section, and exactly six recent items.
- [x] Recent items use one column on mobile, three columns on tablet, and four
  columns on desktop.
- [x] Type controls link to `/items/<type>` without requiring those routes yet.
- [x] The dashboard is responsive, keyboard accessible, and preserves health-status behavior.

## Test Plan

- Test content, type links, desktop collapse, and mobile drawer behavior with Vitest.
- Test desktop and mobile dashboard journeys with Playwright.
- [x] `cd frontend && npm run typecheck`
- [x] `cd frontend && npm run lint`
- [x] `cd frontend && npm run format:check`
- [x] `cd frontend && npm run test`
- [x] `cd frontend && npm run build`
- [x] `cd frontend && npm run test:e2e`

## Security and Privacy

- All displayed content is fictional local mock data. No private API data is read or exposed.

## Decisions and Open Questions

- The three supplied phase documents are one dependent UI-only feature; persistence stays deferred.
- React Router owns client-side routes. The dashboard establishes the first product route and type links establish the next route family, so routing is no longer deferred.

## Implementation Notes

- Keep mock data in `frontend/src/lib/mock-data.ts`.
- Use the existing Tailwind and local shadcn/ui component foundation.
- Preserve the landing page at `/`.

## Completion Notes

Completed on 2026-08-26.

- Added React Router with landing, dashboard, and fallback routes.
- Added the responsive dashboard shell, collapsible desktop sidebar, accessible
  mobile drawer, statistics, collection cards, and six recent items using typed
  mock data.
- Added focused Vitest interaction coverage and desktop/mobile Playwright journeys.
- Verified all backend and frontend quality gates, including 12 pytest tests, 6
  Vitest tests, and 5 Playwright tests.
- Visually verified desktop and mobile layouts with no browser console warnings or
  errors.
- Kept the desktop sidebar fixed at the viewport edge during vertical dashboard
  scrolling, with automated and visual verification.
- Reduced the mock snippet count to eight, removed pinned-item data and UI, and
  added the responsive one/three/four-column recent-items grid.
- Completed the mobile drawer interaction with focus containment, scroll locking,
  Escape handling, and focus restoration to its trigger.
