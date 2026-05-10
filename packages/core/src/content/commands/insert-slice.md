---
name: insert-slice
description: Insert a slice at a specific position
version: "1.0.0"
argument-hint: "<position> <slice-name>"
tools: [read, write, bash, grep, glob]
---

<objective>
Insert new slice between existing slices, adjusting dependencies.
</objective>

<execution_context>

1. Validate target position (after-slice-id)
2. Ask user for new slice title
3. PROMPT user inline for branch name with default `feat/<slugified-title>`
4. Create new slice with correct dependencies:
   `{{command-tool}} slice:create --milestone-id <id> --title <title> --branch <name>`
   (additional dep wiring via `{{command-tool}} dep:add-slice`)
5. Update downstream slice dependencies

</execution_context>
