---
name: feature
description: Manage the DevStash feature workflow, including loading specs, starting work, reviewing and explaining changes, testing, and safely completing features.
---

# Feature Workflow

Manage a feature from specification through verified completion. Treat the text after
`$feature` as the action and its arguments.

## Sources of Truth

- `context/project-overview.md` defines product scope and selected technologies.
- `context/coding-standards.md` defines implementation and testing conventions.
- `context/ai-interaction.md` defines permissions and the shared workflow.
- `context/current-feature.md` is the working snapshot for the active feature.
- The linked spec under `context/features/` or `context/fixes/` owns the durable
  requirements and acceptance criteria.

Resolve conflicts before changing code. Loading a spec does not authorize
implementation, commits, merges, publication, deployment, or file deletion.

## Actions

Read only the action file matching the first argument:

| Action | Instructions | Purpose |
| --- | --- | --- |
| `load` | [actions/load.md](actions/load.md) | Load or create a feature spec |
| `start` | [actions/start.md](actions/start.md) | Plan and begin implementation |
| `review` | [actions/review.md](actions/review.md) | Review changes against the spec |
| `explain` | [actions/explain.md](actions/explain.md) | Explain what changed and why |
| `test` | [actions/test.md](actions/test.md) | Add or run relevant tests |
| `complete` | [actions/complete.md](actions/complete.md) | Verify and safely finish work |

Pass remaining arguments to the action. If no action is provided, briefly explain
the available actions and do not modify files.

## Working File

`context/current-feature.md` contains:

- `# Current Feature` with the active feature name when loaded;
- `## Status`: `Not Started`, `In Progress`, `Blocked`, or `Completed`;
- `## Active Spec`: link to the durable spec;
- `## Goals`: working copy of success criteria from the spec;
- `## Notes`: current constraints and implementation context;
- `## History`: append-only list of completed features.

Keep the working status synchronized with the linked spec.

