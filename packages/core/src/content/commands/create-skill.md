---
name: create-skill
description: Create a new skill definition
version: "1.0.0"
argument-hint: "<candidate-number|description>"
tools: [read, write, bash, grep, glob, agent, artifact-review]
---

<objective>
Create new skill file from pattern evidence ∨ user description. Draft reviewed via {{artifact-review}} before deployment.
</objective>

<context>
Read tff conventions: @references/conventions.md
Read orchestrator pattern: @references/orchestrator-pattern.md
</context>

<execution_context>
Execute create-skill workflow from @workflows/create-skill.md.
</execution_context>
