---
name: setup-project-skills
description: "Use during project:init to scaffold repo-level agent configuration (CLAUDE.md, AGENTS.md, tracker labels)."
version: "1.0.0"
tags: [process, onboarding]
---

# Setup Project Skills

## When to Use in tff

During `project:init` or when onboarding a new repository into tff. Scaffolds the configuration files that downstream skills and agents read to understand project conventions.

## Goal

Create a consistent, discoverable repo-level agent configuration so engineering skills can locate the state tracker, interpret labels, and find domain documentation.

## Workflow

### 1. Discovery

Inspect the repository for existing configuration:

- Remotes (GitHub, GitLab, other)
- Root-level instruction files (`CLAUDE.md`, `AGENTS.md`, `README.md`)
- Context files (`CONTEXT.md`, `DOMAIN.md`)
- ADR directories (`docs/adr/`, `adr/`)
- Existing agent documentation (`docs/agents/`, `.scratch/`)

### 2. Presentation

Summarize findings and ask three sequential questions:

1. **Issue tracker**: How are items tracked? (GitHub issues, GitLab issues, local `.scratch/`, other)
2. **Triage labels**: Map canonical states (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) to actual label strings
3. **Domain context**: Single context (one root file + ADR folder) or multi-context (monorepo with per-package docs)

### 3. Documentation

Draft an `## Agent Skills` block in the root instruction file:

- Update `CLAUDE.md` if it exists
- Otherwise update `AGENTS.md`
- If neither exists, ask the user which to create
- If the heading already exists, modify it in place without duplication

The block contains subsections pointing to detail files:

- `docs/agents/issue-tracker.md` — tracker location and CLI commands
- `docs/agents/triage-labels.md` — label mappings
- `docs/agents/domain.md` — context files and glossary location

### 4. Completion

Inform the user that setup is finished. Note which capabilities will read these files. Remind them that documents can be edited directly later without rerunning this skill unless the tracker or overall structure changes.

## Constraints

- All examples are read-only or hypothetical — no executable filesystem-write examples
- Never create `CLAUDE.md` when `AGENTS.md` exists, or vice versa
- Do not alter surrounding content when updating an existing heading
