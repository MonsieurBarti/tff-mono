---
name: sync
description: Regenerate STATE.md from SQLite
version: "1.0.0"
tools: [read, bash, grep, glob]
---

<objective>
Regenerate STATE.md from current SQLite state.
</objective>

<execution_context>

1. Run sync:state via {{command-tool}}
2. Display sync report
3. No silent data loss — report everything

</execution_context>
