---
name: create-skill
description: "Use when creating a new skill from a detected pattern or user description. Drafts skill file, validates it, reviews via plannotator before deployment."
version: "1.0.0"
tags: [meta, authoring]
---

# Create Skill

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## When to Use

Draft new skill from pattern candidate ∨ user description.

## Steps

1. INPUT: candidate number (load from candidates.jsonl) ∨ free-text description
2. LOAD @skills/skill-authoring/SKILL.md → SPAWN subagent ("Draft New Skill" mode):
   - provide pattern evidence (∨ description) + existing skills as format examples
   - draft → `.tff-cc/drafts/<skill-name>.md`
3. VALIDATE: `tff-tools skills:validate --skill '<json>'`
   - fail → drafter fixes ∧ re-validates
4. REVIEW: invoke Skill `plannotator-annotate` with arg `.tff-cc/drafts/<skill-name>.md`
5. HANDLE:
   - approved → move `.tff-cc/drafts/<name>.md` → `skills/<name>.md`
   - feedback → revise ∧ re-invoke `plannotator-annotate`
   - rejected → delete draft
6. NEXT: @references/next-steps.md
