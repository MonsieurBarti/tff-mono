---
name: status
description: Show current position in the lifecycle with next step suggestion
version: "1.0.0"
tools: [read, bash, grep, glob]
---

<objective>
Lightweight status check — show where you are ∈ tff lifecycle ∧ suggest next command. Does NOT regenerate STATE.md (use {{command-prefix}}progress for that).
</objective>

<execution_context>

1. Read {{project-dir}}STATE.md if ∃ (don't regenerate)
2. Check for in-progress slices: `{{command-tool}} slice:list` (no filter) → identify
   slices with status ∉ {closed}
3. Show current position:
   - Active milestone (if ∃)
   - Active milestone slices (kind=milestone, status ≠ closed)
   - Active quick tasks (kind=quick, status ≠ closed) — read from
     {{project-dir}}quick/STATE.md if ∃ ∨ via `{{command-tool}} slice:list --kind quick`
   - Active debug tasks (kind=debug, status ≠ closed) — read from
     {{project-dir}}debug/STATE.md if ∃ ∨ via `{{command-tool}} slice:list --kind debug`
   - What phase the active slice is ∈
4. Suggest next command from @references/next-steps.md

If ¬ project ∃, suggest {{command-prefix}}new.
If ¬ STATE.md ∃ for the active scope, suggest {{command-prefix}}progress to generate it.
</execution_context>
