---
name: complete-milestone
description: Create milestone PR, review, and merge to main
version: "1.0.0"
tools: [read, write, bash, grep, glob, agent]
---

<objective>
Create milestone PR, run security audit, review via {{artifact-review}}, ∧ merge to main.
</objective>

<execution_context>
Execute complete-milestone workflow from @workflows/complete-milestone.md.
</execution_context>
