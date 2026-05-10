---
name: rollback
description: Rollback a slice or milestone
version: "1.0.0"
tools: [read, write, bash, grep, glob]
---

<objective>
Revert all execution-generated commits for slice back to checkpoint base commit.
</objective>

<execution_context>
Execute rollback workflow from @workflows/rollback.md.
</execution_context>
