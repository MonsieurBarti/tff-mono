---
name: create-skill
description: Use when creating a new Claude Code skill in this project. Scaffolds the skill directory and SKILL.md with correct frontmatter, required sections, and validates against skill-authoring conventions.
version: "1.0.0"
tags: [meta, authoring]
user-invocable: true
argument-hint: <skill-name>
---

# Create a New Skill

Scaffold a new Claude Code skill in `.claude/skills/` following project conventions.

## When to Use

- Creating a new skill from scratch
- User says "add a skill for X" or "I want a skill that does Y"

## Process

### Step 1: Gather Information

If the skill name was provided as an argument, use it. Otherwise ask. Collect via stepper UI:

1. **Name** — kebab-case, 1-64 chars, `^[a-z0-9]+(-[a-z0-9]+)*$`
2. **Description** — must start with "Use when", max 1024 chars, no symbolic notation
3. **Type** — Rigid (gates, conventions) or Flexible (design, debugging)
4. **Body pattern** — ask which structure fits best:
   - **Phased workflow** (default) — numbered steps with checklists
   - **Interactive interview** — uses `<what-to-do>` / `<supporting-info>` XML tags
   - **Pass-through** — body IS the instruction, add `disable-model-invocation: true` to frontmatter

Validate each input before proceeding. Reject and re-prompt if invalid.

### Step 2: Check for Conflicts

Verify `.claude/skills/<name>/` does not already exist. If it does, ask whether to overwrite or pick a different name.

### Step 3: Create the Skill

Create `.claude/skills/<name>/SKILL.md` using the template in REFERENCE.md. For rigid skills, add a `## HARD-GATE` section after "When to Use".

### Step 4: Validate

Run the validation checklist from REFERENCE.md. Report pass/fail for each item.

### Step 5: Remind Next Steps

Tell the user:

- Fill in Process steps and Anti-Patterns with real content
- Split into REFERENCE.md if body grows > 500 lines
- Reference other skills by name if composing (`run /other-skill first`)
- Skill is auto-discovered — no registration needed
- Test by invoking `/<name>` in a conversation

## Output

- A new `.claude/skills/<name>/SKILL.md` with valid frontmatter and all required sections
- Validation report confirming compliance

## Anti-Patterns

- Creating a skill without "Use when" in description — loader uses description for matching; vague descriptions mean the skill never triggers
- Writing SKILL.md > 500 lines without splitting — hurts token efficiency; split into REFERENCE.md
- Using symbolic notation (∀, ∃, ¬) in description — loader matches literal substrings, not symbolic logic
- Skipping Anti-Patterns section — that's where real value lives; without it the skill just describes rather than prescribes
- Making skills that describe rather than prescribe — skills are workflows with concrete steps, not documentation

## Rules

- Name: 1-64 chars, `[a-z0-9-]`, no leading/trailing/consecutive hyphens
- Description: starts with "Use when", ≤ 1024 chars, 3rd person, no compression
- All required sections present: When to Use, Process, Output, Anti-Patterns, Rules
- No dangerous commands in templates
- Skills auto-discovered from `.claude/skills/` — no manifest registration
