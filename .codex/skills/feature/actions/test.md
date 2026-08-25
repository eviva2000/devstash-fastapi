# Test Action

1. Read the current feature and the linked spec's acceptance criteria and test plan.
2. Inspect the feature diff to identify changed behavior and risk boundaries.
3. If asked to add tests, write focused tests for observable behavior and follow
   `context/coding-standards.md`.
4. Run focused tests first, then all applicable project checks:
   - Backend: `uv run pytest`, `uv run ruff check .`,
     `uv run ruff format --check .`, and `uv run mypy`.
   - Frontend: the configured Vitest command when the React app exists.
   - End-to-end: relevant Playwright journeys for changed user-facing behavior.
5. Discover frontend commands from the package scripts; do not invent them. If the
   frontend is not initialized, report frontend checks as not applicable.
6. Do not weaken a valid assertion to make a failing product test pass. Diagnose the
   product or setup failure if a fix was not requested.
7. Report exact commands, pass/fail counts, skipped checks, and meaningful gaps.

Testing does not authorize commits, merges, pushes, publication, deployment, or
branch deletion.
