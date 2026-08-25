# DevStash - Project Overview

> A full-stack application built with Python and React for organizing developer
> knowledge and resources.

## Problem Statement

Developers keep useful material across editors, chat histories, bookmarks, shell
history, notes, and project folders. DevStash aims to provide one searchable place
for snippets, prompts, commands, notes, links, files, and images.

This repository is a teaching-focused full-stack rebuild of DevStash. Python and
FastAPI provide the backend API, while React provides the browser interface. Features
are introduced incrementally through written specs and verified with automated tests
and static analysis across both parts of the application.

## Target Users

- Everyday developers who need quick access to reusable knowledge.
- AI-first developers who save prompts, contexts, and workflows.
- Educators and content creators who organize code and explanations.
- Full-stack developers who collect patterns, commands, and API examples.

## Product Direction

### Items

Items are the core resource. The planned system types are:

| Type | Content | Notes |
| --- | --- | --- |
| Snippet | Text | Source code with an optional language |
| Prompt | Text | Reusable AI prompt |
| Command | Text | Shell or tool command |
| Note | Text | General Markdown content |
| Link | URL | Bookmark with metadata |
| File | Binary | Planned Pro capability |
| Image | Binary | Planned Pro capability |

Exact fields and API contracts must be defined in their feature specs before
implementation.

### Collections and Tags

- An item may belong to multiple collections.
- Items may have multiple tags.
- Collections and items may be favorited.
- Items may be pinned.

### Search

Search is expected to cover titles, content, tags, and item types. Matching rules,
pagination, and performance requirements belong in the search feature spec.

### Web Application

The React frontend will provide the complete user-facing DevStash experience,
including:

- responsive navigation and dashboard views;
- item, collection, tag, and search workflows;
- authentication and account screens;
- loading, empty, validation, and error states;
- accessible keyboard and screen-reader interactions.

The frontend uses TypeScript, Tailwind CSS, shadcn/ui, Vitest for unit tests, and
Playwright for end-to-end browser tests. Build tooling, routing, state management,
and linting and formatting tools will be selected in the frontend-foundation spec.

The React language choice, build tool, routing library, styling approach, state
management, and test tools have not been selected. Those decisions must be recorded
before the frontend foundation is implemented.

### Authentication and Accounts

The product direction includes email/password and GitHub sign-in. The Python auth
library, session or token strategy, and account schema have not been selected.

### Future Integrations

- PostgreSQL persistence.
- Object storage for files and images.
- Stripe subscriptions.
- OpenAI-powered tagging, descriptions, code explanations, and prompt optimization.

These are product goals, not installed or approved technical dependencies. Each
integration requires its own spec and explicit technology decision.

## Project Scope

The intended product is a full-stack web application consisting of:

- a Python/FastAPI backend that owns business rules, validation, persistence,
  authorization, and integrations;
- a React frontend that consumes the API and provides the browser experience;
- automated tests and quality checks for both layers.



## Technology Direction

### Current Backend Stack

| Category | Technology | Purpose |
| --- | --- | --- |
| Language | Python 3.12+ | Application language |
| API framework | FastAPI | Routing, dependency injection, and OpenAPI |
| Server | Uvicorn | ASGI development and production server |
| Validation | Pydantic | Typed request and response models |
| Environment manager | uv | Dependencies, lockfile, and command execution |
| Tests | pytest + FastAPI TestClient | Automated behavior verification |
| Lint and format | Ruff | Code quality and formatting |
| Static types | Mypy (strict) | Type checking |

### Frontend Stack

| Category | Technology | Status |
| --- | --- | --- |
| UI library | React | Selected |
| Frontend language | TypeScript | Selected |
| Build tooling | To be selected | Requires a frontend-foundation spec |
| Routing | To be selected | Requires a frontend-foundation spec |
| Styling | Tailwind CSS | Selected |
| Component library | shadcn/ui | Selected |
| Unit tests | Vitest | Selected |
| End-to-end tests | Playwright | Selected |
| Linting and formatting | To be selected | Requires a frontend-foundation spec |

## Architecture Direction

```text
Browser
    |
React application       User interface and client-side interaction
    |
HTTP/JSON API
    |
FastAPI routes          API validation and HTTP semantics
    |
Application services   Use cases and business rules
    |
Repositories           Persistence boundary, when introduced
    |
PostgreSQL              Planned; library and hosting undecided
```

External services should be accessed behind focused integration boundaries rather
than directly from route handlers. Architecture is added only as features require
it. The React application communicates with backend capabilities through documented
API contracts rather than depending on backend implementation details.

## Repository Structure

```text
devstash-fastapi/
├── context/
│   ├── ai-interaction.md
│   ├── coding-standards.md
│   ├── current-feature.md
│   ├── project-overview.md
│   └── features/
│       ├── _template.md
│       └── <feature-name>.md
├── exercises/
├── frontend/                 # React application, once initialized
├── src/devstash/
│   ├── __init__.py
│   └── main.py
├── tests/
├── pyproject.toml
└── uv.lock
```

The `api`, `models`, `services`, `repositories`, and `core` backend packages described
in the coding standards should be created only when an implemented feature needs
them. The exact React directory structure will be chosen in the frontend-foundation
spec rather than assumed here.

## Feature Specification Process

Every feature gets one durable spec under `context/features/`. A spec defines:

- user-visible outcome and goals;
- explicit non-goals;
- API and data contracts;
- observable acceptance criteria;
- test, security, and privacy considerations;
- decisions and open questions;
- completion notes.

`context/current-feature.md` points to the single active spec and keeps a working copy
of its goals and notes for the feature skill. Planning or loading a feature does not
mark it as implemented.

## Running the Current Backend

```bash
uv sync
uv run uvicorn devstash.main:app --app-dir src --reload
```

The current endpoints are:

- Health: `http://127.0.0.1:8000/health`
- OpenAPI UI: `http://127.0.0.1:8000/docs`

## Quality Gates

```bash
uv run pytest
uv run ruff check .
uv run ruff format --check .
uv run mypy
```

All checks must pass before a feature is eligible to commit.

Frontend commands will be added here after its package manager and quality tools are
selected. Once the React application exists, a full-stack feature must pass the
relevant checks for both frontend and backend.

## Near-Term Roadmap

The order is intentionally provisional; each item needs a feature spec before work
begins.

1. Specify and initialize the React frontend foundation.
2. Establish shared frontend/backend development and configuration workflows.
3. Select and configure persistence and migrations.
4. Define item types and implement item CRUD across the API and UI.
5. Implement collections and tags across the API and UI.
6. Add search and pagination.
7. Add authentication and per-user authorization.
8. Add file storage, billing, and AI integrations as separate later features.

## Out of Scope

- Native mobile and desktop applications unless the project scope is expanded.
- Reproducing the original Next.js implementation detail-for-detail.
- Treating future product ideas as already approved requirements.
