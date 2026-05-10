# Map Codebase

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Analyze codebase → structured docs via parallel doc-writer agents.

## Prerequisites

`project:init` has run (`{{project-dir}}/` symlink exists).

## Steps

1. LOAD @skills/codebase-documentation/SKILL.md → SPAWN 3 subagents ∈ parallel:
   - **tech**: write STACK.md → `{{project-dir}}/docs/STACK.md` (load @skills/hexagonal-architecture/SKILL.md)
   - **arch**: write ARCHITECTURE.md → `{{project-dir}}/docs/ARCHITECTURE.md` (load @skills/hexagonal-architecture/SKILL.md)
   - **concerns**: write CONCERNS.md → `{{project-dir}}/docs/CONCERNS.md`
2. LOAD @skills/codebase-documentation/SKILL.md → SPAWN subagent: read ARCHITECTURE.md + STACK.md → write CONVENTIONS.md
   - document: naming, imports, error handling, test structure, function design
3. NOTE: Docs written to `~/.tff/{projectId}/docs/` — not tracked by git.
4. SUMMARY: list generated files (STACK, ARCHITECTURE, CONCERNS, CONVENTIONS)
5. NEXT: @references/next-steps.md
