---
name: add-slice
description: Add a slice to the current milestone
version: "1.0.0"
argument-hint: "<slice-name>"
tools: [read, write, bash, grep, glob]
---

<objective>
Add new slice to end of current milestone's slice list.
</objective>

<execution_context>

1. Determine current milestone from state
2. Ask user for slice title (description)
3. PROMPT user inline for branch name with default `feat/<slugified-title>`
   (orchestrator drives prompt; {{command-tool}} does ¬ prompt)
4. Create slice as child of milestone:
   `{{command-tool}} slice:create --milestone-id <id> --title <title> --branch <name>`
   (kind defaults to milestone)
5. Slice number is auto-assigned by {{command-tool}}

</execution_context>
