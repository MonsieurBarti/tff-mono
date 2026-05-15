---
name: compose
description: Detect skill co-activation clusters and propose bundles or agents
version: "1.0.0"
tools: [read, write, bash, grep, glob, agent, artifact-review]
---

<objective>
Analyze skill co-activation patterns ∧ propose skill bundles ∨ specialized agent definitions.
</objective>

<context>
Read tff conventions: @references/conventions.md
Read orchestrator pattern: @references/orchestrator-pattern.md
</context>

<execution_context>
Execute compose-skills workflow from @workflows/compose-skills.md.
</execution_context>
