# create-skill — Reference

## Stepper UI Prompts

**Step 1/4 — Name**

```
Step 1/4 — Skill name

Enter a kebab-case name (1-64 chars, [a-z0-9-], no leading/trailing/consecutive hyphens):

>
```

Regex: `^[a-z0-9]+(-[a-z0-9]+)*$` (max 64 chars total, rejects leading/trailing/consecutive hyphens)

**Step 2/4 — Description**

```
Step 2/4 — Description

Enter a description (max 1024 chars, 3rd person, must start with "Use when"):
  - Good: "Use when creating a new skill. Scaffolds directory and validates conventions."
  - Bad: "I help you create skills" (1st person)

>
```

**Step 3/4 — Type**

```
Step 3/4 — Skill type

  1. Rigid (follow exactly — gates, conventions, TDD)
  2. Flexible (adapt to context — design, debugging, brainstorming)

>
```

**Step 4/4 — Body Pattern**

```
Step 4/4 — Body structure

  1. Phased workflow (default) — numbered steps with checklists
  2. Interactive interview — XML-tagged sections for Q&A-driven skills
  3. Pass-through — body IS the instruction, no agent exploration needed

>
```

## Frontmatter Fields Reference

| Field                      | Required | Description                                                      |
| -------------------------- | -------- | ---------------------------------------------------------------- |
| `name`                     | Yes      | kebab-case identifier                                            |
| `description`              | Yes      | 3rd person, starts with "Use when", max 1024 chars               |
| `user-invocable`           | No       | `true` if skill can be triggered via `/name` (default: false)    |
| `argument-hint`            | No       | Placeholder text shown for arguments (e.g., `<skill-name>`)      |
| `when_to_use`              | No       | Extended trigger conditions beyond description                   |
| `allowed-tools`            | No       | Restrict which tools the skill can use                           |
| `arguments`                | No       | Structured argument definitions                                  |
| `context`                  | No       | `fork` (isolated context) or `agent` (sub-agent)                 |
| `paths`                    | No       | Glob patterns — skill auto-loads when matching files are touched |
| `model`                    | No       | Override model for this skill (e.g., `opus`, `sonnet`)           |
| `effort`                   | No       | Reasoning effort level                                           |
| `disable-model-invocation` | No       | `true` for pass-through skills where body IS the instruction     |

## SKILL.md Template

```markdown
---
name: <name>
description: <description>
user-invocable: true
---

# <Title derived from name>

## When to Use

- <trigger condition 1>
- <trigger condition 2>

## Process

### Step 1: <first step>

<describe what happens>

### Step 2: <next step>

<describe what happens>

## Output

<what the skill produces>

## Anti-Patterns

- <mistake 1 — and why it's wrong>
- <mistake 2 — and why it's wrong>
- <mistake 3 — and why it's wrong>

## Rules

- <constraint 1>
- <constraint 2>
```

For **rigid** skills, add after "When to Use":

```markdown
## HARD-GATE

<mandatory constraint that blocks progress if not met>
```

## Alternative Body Templates

### Interactive Interview Pattern

For skills that drive a Q&A session with the user:

```markdown
<what-to-do>
Interview the user about [topic]. Ask one question at a time.
Do not proceed until [condition] is clear.
</what-to-do>

<supporting-info>
## Domain awareness
[Reference material the agent needs to conduct the interview]
</supporting-info>
```

### Pass-Through Pattern

For skills where the body IS the direct instruction (no exploration needed):

```yaml
---
name: <name>
description: <description>
user-invocable: true
disable-model-invocation: true
---
```

```markdown
[Direct instruction — this is executed as-is, not interpreted]

## Checklist

- [ ] Step 1
- [ ] Step 2
```

## Dynamic Content Injection

Skills can inject dynamic content at load time:

**Shell output:**

```markdown
! git log --oneline -5
```

Executes the command and inlines the output into the skill body when loaded.

**Arguments:**

```markdown
$ARGUMENTS — full argument string passed after the skill name
$0 — the skill name itself
$1, $2, ... — positional arguments (space-separated)
```

Example: `/create-skill my-new-skill` → `$1` = `my-new-skill`

Use `$ARGUMENTS` for free-form input; use `$1`/`$2` when the skill expects structured positional args.

## Cross-Skill References

Skills can reference other skills for composition:

```markdown
If [condition], run `/other-skill` first before proceeding.
```

Use this when:

- A skill depends on setup from another skill
- Multiple skills form a pipeline (e.g., design → implement → review)

## Validation Checklist

1. Name matches `^[a-z0-9]([a-z0-9]|-(?!-))*$` (max 64 chars), no leading/trailing/consecutive hyphens
2. Description ≤ 1024 chars, 3rd person, starts with "Use when"
3. SKILL.md ≤ 500 lines (warn if close; split into REFERENCE.md if over)
4. Anti-Patterns section present with ≥ 3 entries
5. No dangerous commands (rm -rf, sudo, curl|bash)
6. No time-sensitive content (dates, "recently", "currently")
7. All required sections present: When to Use, Process, Output, Anti-Patterns, Rules

## Next Steps Message

```
Skill created at .claude/skills/<name>/SKILL.md

Next steps:
  1. Fill in the Process steps with real content
  2. Fill in Anti-Patterns with actual mistakes you've seen
  3. If the body grows > 500 lines, split into REFERENCE.md / EXAMPLES.md
  4. The skill is auto-discovered — no registration needed
  5. Test it by invoking /<name> in a conversation
```
