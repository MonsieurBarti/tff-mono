---
name: settings
description: Show or update tff settings
version: "1.0.0"
argument-hint: "<key> <value>"
tools: [read, write, bash, grep, glob]
---

<objective>
View ∧ modify all tff project settings. Detects missing fields ∧ offers to add them with defaults.
</objective>

<context>
Read tff conventions: @references/conventions.md
Read settings template: @references/settings-template.md
</context>

<execution_context>
Execute settings workflow from @workflows/settings.md.
</execution_context>
