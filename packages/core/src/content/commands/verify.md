---
name: verify
description: Verify acceptance criteria via product-lead and artifact-review
version: "1.0.0"
argument-hint: "[slice-id] [--tier S|SS|SSS]"
tools: [read, write, bash, grep, glob, agent, artifact-review]
---

<objective>
Verify slice implementation against acceptance criteria.
</objective>

<context>
Read tff conventions: @references/conventions.md
</context>

<execution_context>
Execute verify-slice workflow from @workflows/verify-slice.md.
</execution_context>
