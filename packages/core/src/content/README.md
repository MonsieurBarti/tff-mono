# Content Surfaces

Shared agents and skills for TFF hosts.

## Directory Structure

```
agents/          — Markdown files with YAML frontmatter + body (one per agent)
skills/          — One directory per skill, each containing SKILL.md
content-baselines.json — SHA-256 baselines for drift detection
```

## Agent Frontmatter

Every agent markdown file starts with a YAML frontmatter block:

```yaml
---
name: string
model?: string
description?: string
version?: string
identity?: string
routing:
  handles: string[]
  priority: number
  min_tier: string
capabilities?:
  reviews_code?: boolean
  writes_code?: boolean
  runs_tests?: boolean
  validates_ac?: boolean
  security_focus?: boolean
  audits_decisions?: boolean
  read_only?: boolean
  inline_fixes?: boolean
tools: string[]
thinking?: "on" | "off" | "extended"
systemPromptMode?: "replace" | "append"
inheritProjectContext?: boolean
inheritSkills?: boolean
---
```

## Skill Frontmatter

Every SKILL.md starts with:

```yaml
---
name: string
description: string
version?: string
trigger_phrases?: string[]
tags?: string[]
user-invocable?: boolean
argument-hint?: string
---
```

## Baselines

`content-baselines.json` stores SHA-256 hashes of every agent and skill file. When content changes, drift detection reports the delta.

To recompute baselines after frontmatter or content changes:

```bash
node packages/core/scripts/compute-baselines.mjs
```

Review the diff, then commit the updated `content-baselines.json`.

## Adding Content

- **New agent**: create `agents/<name>.md` with frontmatter + body, then recompute baselines.
- **New skill**: create `skills/<name>/SKILL.md` with frontmatter + body, then recompute baselines.
