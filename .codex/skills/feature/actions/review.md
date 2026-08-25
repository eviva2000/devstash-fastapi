# Review Action

Review without modifying code unless the user explicitly asks for fixes.

1. Read the foundational context, current feature, and linked spec.
2. Inspect the working tree, branch history, and complete feature diff against its
   base.
3. Check every goal, acceptance criterion, and non-goal.
4. Review correctness, security, validation, authorization, accessibility,
   performance, API compatibility, test quality, and project conventions where
   relevant.
5. Run lightweight read-only checks when needed to validate a finding.
6. Report actionable findings first, ordered by severity, with precise file and line
   references. Then list open questions and verification gaps.
7. If there are no findings, say so and note residual risks or tests not run.

