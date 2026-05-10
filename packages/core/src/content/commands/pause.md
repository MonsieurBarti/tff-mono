---
name: pause
description: Save execution checkpoint for later resume
version: "1.0.0"
tools: [read, write, bash, grep, glob]
---

<objective>
Save current execution state so it can be resumed later with `{{command-prefix}}resume`.
</objective>

<execution_context>

1. Determine currently executing slice
2. Save checkpoint with current wave, completed tasks, executor log
3. Print resume instructions
   </execution_context>
