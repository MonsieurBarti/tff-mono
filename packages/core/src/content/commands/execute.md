---
name: execute
description: Execute a slice with wave-based parallelism and TDD
version: "1.0.0"
argument-hint: "[slice-id] [--tier S|SS|SSS]"
tools: [read, write, edit, bash, grep, glob, agent]
---

<objective>
Execute all tasks ∈ slice using wave-based parallel execution with TDD enforcement.
</objective>

<context>
Read tff conventions: @references/conventions.md
Read model profiles: @references/model-profiles.md
</context>

<execution_context>
Execute execute-slice workflow from @workflows/execute-slice.md.
</execution_context>
