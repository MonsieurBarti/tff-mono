---
name: resume
description: Resume work from checkpoint
version: "1.0.0"
argument-hint: "<slice-id>"
tools: [read, write, bash, grep, glob]
---

<objective>
Load checkpoint ∧ resume execution from where it left off.
</objective>

<execution_context>

1. Load checkpoint for slice
2. Skip completed waves
3. Continue execution from current wave
4. Delegates to execute-slice workflow with checkpoint data

</execution_context>
