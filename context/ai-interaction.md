# AI Interaction Guidelines

## Communication

- Be concise and direct.
- Explain non-obvious decisions briefly.
- Ask before large refactors or architectural changes.
- Do not add behavior that is absent from the active feature spec.
- Never delete files without explicit approval.

## Source of Truth

- `context/project-overview.md` defines the product direction and current stack.
- `context/coding-standards.md` defines implementation conventions.
- `context/current-feature.md` identifies the feature currently in progress and keeps
  its working goals, notes, status, and completion history.
- `context/features/<feature-name>.md` is the source of truth for that feature's
  scope, acceptance criteria, and implementation notes.
- If documents disagree, pause and surface the conflict instead of guessing.

## Feature Workflow

Use this workflow for every feature or fix:

1. **Specify** - Create or update a spec in `context/features/` from the feature
   template.
2. **Select** - Link the spec from `context/current-feature.md` and set its status.
3. **Branch** - Create a focused branch when the user asks to begin implementation.
4. **Implement** - Make only the changes required by the active spec.
5. **Verify** - Run the relevant tests and all project quality checks. Backend checks
   are `uv run pytest`, `uv run ruff check .`, `uv run ruff format --check .`, and
   `uv run mypy`. Frontend changes also require Vitest and relevant Playwright tests
   once their project scripts exist.
6. **Iterate** - Resolve failures and compare the result with every acceptance
   criterion.
7. **Commit** - Commit only after checks pass and the user gives permission.
8. **Merge** - Merge only with user permission.
9. **Close** - Mark the feature completed in its spec and update
   `context/current-feature.md`.

Documentation and planning do not automatically authorize implementation, commits,
merges, dependency changes, or deployment.

## Branches and Commits

- Prefer `feature/<feature-name>` for features and `fix/<fix-name>` for fixes.
- Ask before creating a branch unless branch creation is part of the user's request.
- Ask before committing.
- Use conventional commit messages such as `feat:`, `fix:`, `test:`, `docs:`, and
  `chore:`.
- Keep each commit focused on one feature or fix.
- Do not add AI attribution to commit messages.

## Code Changes

- Make the smallest coherent change that satisfies the active spec.
- Preserve existing project patterns.
- Do not refactor unrelated code.
- Do not add speculative abstractions or "nice to have" features.
- Update tests and documentation when behavior changes.

## When Stuck

- After two or three failed approaches, stop and explain what was tried.
- Do not continue with random fixes.
- Ask for clarification when a missing decision would materially change the result.

## Review Priorities

Review generated code for:

- Security: authorization, validation, secret handling, and safe error responses.
- Correctness: edge cases, HTTP semantics, and data integrity.
- Performance: blocking work in async routes, inefficient database access, and
  unnecessary network calls.
- Maintainability: clear boundaries, useful types, and consistency with the codebase.
