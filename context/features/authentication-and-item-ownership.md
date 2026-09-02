# Feature: Authentication and Per-User Item Ownership

## Status

Completed

## Summary

Replace the shared anonymous workspace with authenticated user accounts and enforce
per-user ownership for every persisted item operation. A signed-in developer can
access only their own items; unauthenticated callers cannot use the product API.

## Goals

- Let a developer register with an email address and password, sign in, restore an
  existing browser session, and sign out.
- Protect the dashboard and all item API operations behind authentication.
- Assign every new item to the authenticated user without accepting ownership data
  from the client.
- Scope item creation, retrieval, listing, search, filtering, updates, and deletion
  to the authenticated owner at the database-query boundary.
- Prevent callers from discovering whether another user's item exists.
- Migrate existing shared-workspace items through an explicit, reviewed ownership
  policy before making `owner_id` mandatory.
- Add accessible registration, sign-in, session-loading, and sign-out states to the
  React application.

## Non-Goals

- GitHub or other social/OAuth sign-in.
- Email verification, password reset, passwordless sign-in, or multi-factor
  authentication.
- Roles, administrators, teams, shared workspaces, item sharing, or ownership
  transfer.
- User profile editing, account deletion, data export, or privacy-request workflows.
- Soft deletion, item recovery, optimistic concurrency, or item version history.
- Persisted collections or tags.
- Replacing the existing item payloads, filters, pagination, or client-side global
  search behavior beyond making their source data user-scoped.

## User Story

As a developer, I want a private account-backed stash so that only I can view and
change the items I save.

## API Contract

The first slice uses email/password accounts and opaque server-managed sessions
stored in an HTTP-only cookie. Sessions allow multiple active browsers, expire after
30 minutes of inactivity or 30 days absolutely, and are retained for cleanup for no
more than 30 days after expiry or revocation.

All JSON field names continue to use the repository's existing `snake_case`
convention. Authentication failures return stable, non-sensitive `detail` messages;
validation failures retain FastAPI's existing `422` response format.

### Public user representation

```json
{
  "id": "bbfe91a0-29f7-43a7-b917-42f3cccf7930",
  "email": "developer@example.com",
  "created_at": "2026-09-01T09:30:00Z"
}
```

The API never returns password hashes, session token hashes, internal security
metadata, or another user's account data.

### Session representation

```json
{
  "user": {
    "id": "bbfe91a0-29f7-43a7-b917-42f3cccf7930",
    "email": "developer@example.com",
    "created_at": "2026-09-01T09:30:00Z"
  },
  "csrf_token": "opaque-per-session-value"
}
```

The CSRF token is returned only to the same-origin client and must be sent in an
`X-CSRF-Token` header for authenticated `POST`, `PATCH`, and `DELETE` requests.
The session cookie itself is never readable from JavaScript.

### `POST /api/users`

- Request: `{ "email": string, "password": string }`.
- `email` is trimmed, normalized to lowercase for identity and uniqueness, and must
  be a syntactically valid address of at most 254 characters.
- `password` must be 12–128 characters. No composition rules are imposed, so
  passphrases and password-manager generated values remain valid.
- Success: `201 Created` with the session representation, a `Location` header for
  `/api/session`, and a new session cookie.
- An already-registered normalized email returns `409 Conflict` with a generic
  account-creation failure message.
- Invalid input returns `422 Unprocessable Entity` without echoing the password.
- Rate-limited requests return `429 Too Many Requests` with `Retry-After`.

### `POST /api/sessions`

- Request: `{ "email": string, "password": string }`.
- Success: `200 OK` with the session representation and a newly rotated session
  cookie.
- A wrong email or password returns the same `401 Unauthorized` response and
  message. The response must not reveal whether the account exists.
- Rate-limited requests return `429 Too Many Requests` with `Retry-After`.

### `GET /api/session`

- Success: `200 OK` with the current session representation. The per-session CSRF
  token is stable for that session and changes whenever authentication creates a new
  session credential.
- A missing, expired, revoked, or malformed session returns the same `401
  Unauthorized` response. An invalid cookie is cleared.

### `DELETE /api/session`

- Requires the matching `X-CSRF-Token` header when a valid session exists.
- Success: `204 No Content`, revokes the current server-side session, and clears the
  browser cookie.
- The operation is idempotent: a missing or already-invalid session also returns
  `204 No Content` and clears the cookie.

### Existing item endpoints

The request and success-response shapes defined by the Item CRUD and Search and
Filtering specs remain unchanged. `owner_id` is server-controlled and does not
appear in item create/update inputs or the public item representation.

- Every `/api/items` endpoint requires a valid session. Otherwise it returns `401
  Unauthorized` before reading or mutating item data.
- `POST /api/items` derives `owner_id` exclusively from the authenticated session.
- `GET /api/items`, including search, filters, counts, and pagination, queries only
  rows owned by the authenticated user.
- `GET`, `PATCH`, and `DELETE /api/items/{id}` include `owner_id` in the repository
  lookup or mutation predicate.
- For an authenticated user, both an unknown item ID and an item owned by somebody
  else return the existing `404 Not Found` response. The API does not reveal which
  case occurred.
- Authenticated state-changing item requests require the session's CSRF token.
- `GET /health` remains public and unchanged.

Session cookies use `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` outside local
HTTP development. Authentication responses use `Cache-Control: no-store`. CORS must
allow credentials only from configured trusted origins and must never combine
credentialed requests with a wildcard origin.

## Data Model

Add a `users` table through an Alembic migration with:

- application-generated UUID primary key `id`;
- required normalized `email` with a unique database constraint;
- required `password_hash`, excluded from all API response models and logs;
- required timezone-aware `created_at` and `updated_at` timestamps.

Add an `auth_sessions` table with:

- application-generated UUID primary key `id`;
- required `user_id` foreign key to `users.id` with an index;
- a cryptographically random credential stored only as a one-way token hash with a
  unique constraint; the raw credential exists only in the cookie;
- required timezone-aware `created_at`, `last_seen_at`, and `expires_at` timestamps,
  plus an optional `revoked_at` timestamp;
- an index that supports active-session lookup and cleanup.

Alter `items` with:

- required `owner_id` foreign key to `users.id` after the selected legacy-item
  migration policy has populated every existing row;
- an index beginning with `owner_id` for the updated-time listing order;
- owner-aware indexes for established high-frequency item queries where query-plan
  evidence shows the existing indexes are insufficient.

The migration must implement a safe downgrade and must never temporarily expose
legacy items to every authenticated account. Repository queries perform owner
filtering in PostgreSQL rather than loading cross-user rows and filtering in Python.

Email is the only newly collected personal data. Its stated purposes are account
identity and sign-in. It must not be copied to item rows, session cookies, analytics,
or application logs.

## Acceptance Criteria

- [x] A developer can register with a valid unique email and password and receives
  an authenticated browser session.
- [x] A registered developer can sign in, refresh the browser without losing a
  valid session, and sign out; signing out revokes the server-side session.
- [x] Passwords are hashed with a reviewed password-hashing implementation and are
  never stored, returned, or logged in plaintext.
- [x] Session credentials are unpredictable, stored only as hashes server-side,
  rotated on successful authentication, expire according to the selected policy,
  and use the documented cookie flags.
- [x] Registration and sign-in are rate-limited, use non-enumerating authentication
  errors, and never include credentials in logs.
- [x] Authenticated unsafe requests reject a missing or incorrect CSRF token without
  performing the mutation.
- [x] An unauthenticated caller receives `401` from every item endpoint and cannot
  infer item data from response content, counts, search results, or timing-sensitive
  alternate error messages under normal operation.
- [x] Every newly created item receives the authenticated user's ID as its owner,
  regardless of any ownership-like fields a malicious client submits.
- [x] Two users can create items and each user's list, search, filtering, pagination,
  global-search prefetch, detail, update, and delete behavior includes only their own
  records.
- [x] Attempts to read, edit, or delete another user's item return the same `404`
  contract as an unknown ID and leave that item unchanged.
- [x] Owner scoping is present in repository queries and mutation predicates; no
  service performs authorization by filtering an already-loaded cross-user result.
- [x] Existing items are handled by the reviewed legacy migration policy, and the
  final schema does not permit `items.owner_id` to be null.
- [x] The React application provides accessible registration and sign-in forms,
  restores the current session before rendering protected data, redirects signed-out
  users away from protected routes, supports sign-out, and reports safe errors.
- [x] Redirects after authentication accept only validated same-origin application
  paths and cannot be used as open redirects.
- [x] Existing item functionality and `GET /health` remain behaviorally intact for
  an authenticated user.
- [x] Backend and frontend quality gates pass.

## Test Plan

- Add PostgreSQL migration tests for users, sessions, the selected legacy-item
  ownership migration, constraints, indexes, and upgrade/downgrade behavior.
- Add API integration tests for registration, normalized-email uniqueness, sign-in,
  current-session lookup, expiry, revocation, sign-out idempotency, cookie flags, and
  safe authentication errors.
- Test password boundaries, malformed emails, duplicate registration, wrong
  credentials, rate limiting, raw-session-token non-persistence, and absence of
  password/session data in responses and captured logs.
- Test missing, malformed, expired, revoked, and valid session cookies.
- Test CSRF rejection and success for every authenticated unsafe method.
- Create two-user authorization tests covering create, list, search, filters, total
  counts, pagination, get, patch, and delete. Include malicious owner fields and
  verify another user's rows never change.
- Use Vitest for session-state restoration, protected routing, form validation,
  registration/sign-in/sign-out success and failure, CSRF header attachment, and
  safe redirect handling.
- Use Playwright for two isolated browser contexts: each user creates an item, sees
  only their own data in the dashboard and global search, cannot open the other
  user's item URL/API resource, signs out, and loses protected access.
- [x] `uv run pytest`
- [x] `uv run ruff check .`
- [x] `uv run ruff format --check .`
- [x] `uv run mypy`
- [x] `uv run alembic check`
- [x] `cd frontend && npm run typecheck`
- [x] `cd frontend && npm run lint`
- [x] `cd frontend && npm run format:check`
- [x] `cd frontend && npm run test`
- [x] `cd frontend && npm run build`
- [x] `cd frontend && npm run test:e2e`

## Security and Privacy

Trust boundaries are the browser/API boundary, the session-cookie boundary, and the
API/PostgreSQL boundary. The protected assets are passwords, session credentials,
email addresses, and each user's saved item content.

Required abuse-case coverage includes credential stuffing, account enumeration,
session fixation and theft, CSRF, malicious ownership fields, direct-object-reference
attacks, cross-user search/count leakage, and unsafe post-login redirect targets.

- Use a modern password hashing algorithm through a maintained library with
  parameters reviewed and recorded during implementation. Perform dummy hash
  verification for unknown accounts where needed to reduce account-enumeration
  timing differences.
- Generate session credentials with a cryptographically secure random source. Never
  put authentication credentials in `localStorage`, URLs, JSON responses, logs, or
  plaintext database columns.
- Centralize authentication in a FastAPI dependency and require services and
  repositories to receive the authenticated user ID explicitly. The frontend is not
  an authorization boundary.
- Validate CSRF tokens with constant-time comparison and reject untrusted request
  origins for cookie-authenticated unsafe methods.
- Use bound SQLAlchemy expressions for all identity and ownership queries. Preserve
  generic client-safe errors and never expose stack traces or database details.
- Rate-limit authentication attempts using both source and account-derived keys
  without retaining plaintext passwords. The production limiter must work across
  all application processes.
- Apply least-privilege database access, HTTPS in deployed environments, restrictive
  credentialed CORS, and security headers appropriate to the React application.
- Minimize email retention and keep it out of telemetry. Account deletion, export,
  backup erasure, and formal retention policy are deliberately deferred and must be
  specified before claiming GDPR/CCPA-complete account lifecycle support.

This feature materially improves data isolation but does not by itself constitute a
complete production security or privacy program.

## Decisions and Open Questions

Selected decisions:

- Support email/password registration in this first slice and defer GitHub sign-in.
- Use opaque server-managed sessions in an HTTP-only cookie rather than exposing
  bearer tokens to browser JavaScript.
- Use `argon2-cffi` 25.1.0 with Argon2id parameters pinned to time cost 3, memory
  cost 65,536 KiB, parallelism 4, hash length 32 bytes, and salt length 16 bytes.
  Three local development hashes measured 83.8 ms, 88.7 ms, and 117.9 ms (96.8 ms
  mean) on 2026-09-02; production capacity must be rechecked on deployment hardware.
- Use a per-session synchronizer CSRF token plus trusted-origin validation for unsafe
  requests.
- Return `404` for both missing and foreign-owned items to avoid resource-existence
  disclosure.
- Keep `owner_id` server-controlled and absent from public item payloads.
- Require an explicit owner mapping for every legacy item. The final ownership
  migration fails safely while any item remains unmapped; it never assigns a global
  fallback owner or deletes legacy data.
- Allow multiple active sessions. A session expires after 30 minutes of inactivity
  or 30 days from creation, whichever comes first.
- Store rate-limit counters in PostgreSQL so limits are shared across application
  processes. Use independent source-IP and normalized-account counters to allow at
  most five failed sign-ins for either key in 15 minutes, and allow ten registration
  attempts per source IP in one hour. Enforce the returned atomic counter values so
  concurrent failures cannot exceed the limit, and return `Retry-After` when either
  limit is reached.
- Retain the account email while the account exists. Automatically purge expired or
  revoked session rows after 30 days; account deletion and its retention workflow
  remain a separate feature.

Open questions:

- None. Any later change to these security or migration decisions requires updating
  this spec before implementation changes.

## Implementation Notes

- Keep route handlers limited to HTTP concerns. Put credential verification and
  session lifecycle rules behind focused services, and keep persistence in
  repositories using the existing request-scoped `AsyncSession`.
- Add dependencies only after the password/session design is approved and review
  their maintenance, provenance, transitive dependencies, and install behavior.
- Use a single reusable `get_current_user` FastAPI dependency for protected routes,
  but keep owner predicates in repository queries so a forgotten post-query check
  cannot expose another user's item.
- Perform the ownership migration in phases within the reviewed Alembic revision:
  add the column, populate it according to the selected policy, add its foreign key
  and indexes, then enforce `NOT NULL`.
- Update the typed frontend API boundary to send credentials and CSRF headers
  centrally. Do not scatter authentication state or header construction across
  components.
- Preserve the existing item API response representation so authenticated consumers
  do not acquire an unnecessary ownership-field dependency.
- Record the final hashing parameters, cookie settings, session lifetimes, rate-limit
  behavior, and legacy migration choice in this spec before implementation begins.

## Completion Notes

Delivered email/password registration, login, session restoration, logout, CSRF
protection, and per-user item ownership across the FastAPI API and React application.
Opaque session credentials remain hashed server-side, item queries and mutations are
owner-scoped in PostgreSQL, and legacy items require explicit ownership mapping before
the final non-null migration can run.

Authentication abuse controls use shared PostgreSQL fixed-window counters with
independent source and normalized-account keys. Atomic post-failure enforcement and
concurrent integration coverage ensure no more than five failed sign-ins receive a
credential response per key and window. Trusted origins reject wildcard
configuration, and the pinned Argon2id policy is recorded above.

Verification completed on 2026-09-02: 60 backend tests, Ruff lint and format, strict
Mypy, Alembic schema drift, frontend typecheck, ESLint, Prettier, 48 Vitest tests,
production build, and 10 Playwright journeys all passed. Commit pending user approval.
