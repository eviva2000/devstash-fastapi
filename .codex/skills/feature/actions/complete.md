# Complete Action

Verify readiness, update the feature records, and stop at permission boundaries.

## Readiness Gate

1. Read all foundational context, the current feature, and the linked spec.
2. Review the complete feature diff using `review.md`.
3. Confirm every goal and acceptance criterion is met and all non-goals remain out of
   scope.
4. Run all applicable checks from `test.md`, including backend checks, the full Vitest
   suite when the frontend exists, and relevant Playwright journeys.
5. Resolve in-scope failures only when implementation is authorized. If a required
   check cannot run, keep the feature incomplete and explain why.

## Finish Safely

When the readiness gate passes:

1. Set the status in the spec and `context/current-feature.md` to `Completed`.
2. Fill the spec's completion notes with delivered behavior and verification.
3. Append the spec link under `## History` if it is not already present.
4. Show a proposed conventional commit message and ask permission to commit.
5. After an approved commit, ask separately before merging, pushing, publishing,
   deploying, deleting the branch, or deleting files unless the user already
   explicitly authorized that exact action.

Do not mark a feature completed when checks fail or requirements remain unmet.
