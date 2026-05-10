---
name: ship
description: Slice PR with code review, security audit, and artifact-review
version: "1.0.0"
argument-hint: "[slice-id]"
tools: [read, write, bash, grep, glob, agent, artifact-review]
routing:
  pool:
    - tff-spec-reviewer
    - tff-code-reviewer
    - tff-security-auditor
---

<objective>
Run fresh reviewer enforcement, spawn review agents, review via {{artifact-review}}, create ∧ merge slice PR.
</objective>

<context>
Read tff conventions: @references/conventions.md
Read model profiles: @references/model-profiles.md
</context>

<execution_context>
Execute ship-slice workflow from @workflows/ship-slice.md.
</execution_context>
