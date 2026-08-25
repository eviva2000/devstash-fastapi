# Load Action

Load a spec without implementing it.

1. Check the arguments after `load`:
   - If empty, stop with: `load requires a spec name, path, or feature description.`
   - If they name an existing Markdown file, use it.
   - If they are a short name, look for `context/features/<name>.md` and
     `context/fixes/<name>.md`, accepting the `.md` suffix.
   - Otherwise, treat them as an inline description. Copy
     `context/features/_template.md` to a concise kebab-case filename under
     `context/features/`, preserve the user's wording, and derive only strongly
     implied requirements. Put material ambiguity under `Decisions and Open
     Questions`.
2. If a name matches multiple specs, ask which one to use. Never overwrite an
   existing spec.
3. Read the full spec and the foundational files listed in `SKILL.md`.
4. Ensure the spec has a title, status, goals, non-goals, acceptance criteria, and
   test plan. Add missing structure from the template without inventing requirements.
5. Update `context/current-feature.md`:
   - Set the H1 to `# Current Feature: <feature name>`.
   - Set `## Status` to `Not Started` in both files.
   - Link the spec under `## Active Spec`.
   - Copy the spec's goals under `## Goals`.
   - Put relevant constraints and open questions under `## Notes`.
   - Preserve `## History` unchanged.
6. Confirm the loaded spec and summarize its goals, non-goals, and open questions.

Stop after loading. Do not create a branch or change application code.

