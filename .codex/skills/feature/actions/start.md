# Start Action

1. Read `context/current-feature.md` and the linked spec.
2. Verify that `## Goals` is populated. If it is empty or no active spec is linked,
   stop with: `Run $feature load first.`
3. Read the remaining foundational context and inspect the working tree. Stop and
   explain if an unresolved question would materially change implementation or if
   unrelated changes overlap the feature.
4. Set `## Status` to `In Progress` in both `context/current-feature.md` and the spec.
5. Make a todo list mapped to the goals and acceptance criteria.
6. Derive a concise kebab-case branch name from the H1. Create and check out
   `feature/<name>` or `fix/<name>` unless already on the appropriate branch.
   Invoking `start` authorizes branch creation, but not commits, merges, pushes,
   publication, deployment, deletion, or unrelated changes.
7. List the goals, then implement them one by one with the smallest coherent changes.
8. Add or update focused tests as each behavior is implemented.
9. Run relevant checks while iterating and report implemented behavior, changed
   files, verification, and remaining work.

