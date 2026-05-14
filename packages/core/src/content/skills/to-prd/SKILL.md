---
name: to-prd
description: "Use during discuss-slice to synthesize conversation context into a formal PRD with user stories, implementation decisions, testing decisions, and exclusions."
version: "1.0.0"
tags: [process, planning]
---

# To PRD

## When to Use in tff

During `discuss-slice`, after the user has described the problem and the agent has explored the codebase. Synthesizes conversation context into a formal requirements document without further interrogation of the user.

## Goal

Turn the current conversation context into a product requirements document scoped to the slice under discussion.

## Workflow

### 1. Investigate

Grasp the repository's present condition:

- Read relevant source files and tests
- Use domain-specific terminology from `CONTEXT.md` or `DOMAIN.md`
- Adhere to applicable architecture decision records

### 2. Outline Components

Identify principal components requiring creation or alteration. Prioritize "deep modules" — units that encapsulate a lot of functionality in a simple, testable interface which rarely changes. Validate these components with the user and confirm where unit verification is desired.

### 3. Draft Document

Produce a PRD with the following sections:

- **Issue Description**: the user's challenge from their viewpoint
- **Resolution**: the remedy from the user's viewpoint
- **End-user Narratives**: exhaustive, enumerated collection following the pattern: "As an <actor>, I want a <feature>, so that <benefit>."
- **Engineering Choices**: components, interfaces, technical details, structural choices, data models, service agreements, workflows. Exclude source paths or demonstration code. Concise prototypes (state diagrams, type definitions) may appear if they crystallize a choice better than exposition.
- **Validation Strategy**: quality assurance principles, including "only test external behavior, not implementation details"; which parts receive coverage; analogous existing tests
- **Excluded Work**: boundaries of the effort
- **Additional Remarks**: further relevant commentary

### 4. Publish

Save the PRD as `SPEC.md` in the slice directory. Mark it as ready for planning.

## Constraints

- Do not interrogate the user further — synthesize from conversation context only
- If domain terminology is absent, note the gap rather than inventing terms
- Exclude implementation code from the PRD
