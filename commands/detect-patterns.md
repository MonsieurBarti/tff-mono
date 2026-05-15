---
name: detect-patterns
description: Detect patterns in recent agent behavior
version: "1.0.0"
tools: [read, bash, grep, agent]
---

<objective>
Run pattern detection pipeline on observed tool sequences to find recurring workflows worth turning into skills.
</objective>

<context>
Read tff conventions: @references/conventions.md
Read orchestrator pattern: @references/orchestrator-pattern.md
</context>

<execution_context>
Execute detect-patterns workflow from @workflows/detect-patterns.md.
</execution_context>
