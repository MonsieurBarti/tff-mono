---
name: map-codebase
description: Analyze codebase with parallel doc-writer agents
version: "1.0.0"
argument-hint: "[focus: tech|arch|concerns|all]"
tools: [read, write, bash, grep, glob, agent]
---

<objective>
Spawn parallel doc-writer agents to analyze codebase ∧ produce STACK.md, ARCHITECTURE.md, CONCERNS.md, ∧ CONVENTIONS.md ∈ {{project-dir}}docs/.
</objective>

<context>
Read tff conventions: @references/conventions.md
Read orchestrator pattern: @references/orchestrator-pattern.md
</context>

<execution_context>
Execute map-codebase workflow from @workflows/map-codebase.md.

If specific focus provided (e.g., `{{command-prefix}}map-codebase tech`), only run agent for that focus area. Otherwise, run all 4 ∈ parallel + conventions.
</execution_context>
