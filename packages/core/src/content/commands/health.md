---
name: health
description: Diagnose state consistency
version: "1.0.0"
tools: [read, bash, grep, glob]
---

<objective>
Check {{artifact-review}}, state consistency, ∧ worktree integrity.
</objective>

<execution_context>
Execute health workflow from @workflows/health.md.
</execution_context>
