---
name: remove-slice
description: Remove a slice from current milestone
version: "1.0.0"
argument-hint: "<slice-id>"
tools: [read, write, bash, grep, glob]
---

<objective>
Remove slice that hasn't been started yet. Only future slices (discussing status) can be removed.
</objective>

<execution_context>

1. Verify slice ∈ discussing status (¬ started)
2. Remove slice ∧ update dependencies
3. Renumber subsequent slices

</execution_context>
