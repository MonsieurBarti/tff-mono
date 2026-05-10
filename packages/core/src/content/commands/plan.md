---
name: plan
description: Plan a slice with task decomposition and artifact-review
version: "1.0.0"
argument-hint: "[slice-id] [--tier S|SS|SSS]"
tools: [read, write, bash, grep, glob, agent, artifact-review]
---

<objective>
Create task decomposition, detect waves, review via {{artifact-review}}, ∧ set up worktree.
</objective>

<context>
Read tff conventions: @references/conventions.md
Read model profiles: @references/model-profiles.md
</context>

<execution_context>
Execute plan-slice workflow from @workflows/plan-slice.md.
</execution_context>
