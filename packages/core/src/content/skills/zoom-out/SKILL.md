---
name: zoom-out
description: "Use during research-slice and execute-slice when unfamiliar with a section of code. Go up a layer of abstraction and map relevant modules and callers."
version: "1.0.0"
tags: [process, research]
---

# Zoom Out

## When to Use in tff

During `research-slice` and `execute-slice`, when you encounter an unfamiliar code region. Use before making changes to code you do not fully understand.

## Goal

Obtain broader context and a higher-level perspective on how a code region fits into the system.

## Workflow

### 1. State the Gap

Acknowledge the unfamiliar area and the specific question: "I do not know how X relates to Y."

### 2. Map the Landscape

Go up one layer of abstraction. Provide:

- A list of all relevant modules and their responsibilities
- Callers and callees of the target code
- Data flow across module boundaries
- State ownership and lifecycle

### 3. Use Domain Glossary

Describe the map using the project's domain glossary vocabulary (from `CONTEXT.md` or `DOMAIN.md`). Avoid generic terms like "handler" or "service" when domain-specific terms exist.

### 4. Identify Touch Points

Highlight which modules will be affected by the planned change. Flag any cross-module dependencies that may require additional investigation.

## Constraints

- Map only what is verifiable from the codebase — do not invent module relationships
- Prefer concrete file paths and function names over abstract descriptions
- If domain glossary is missing, note the gap and request clarification
