<p align="center">
  <img src="apps/tff-cc/assets/forge-banner.png" alt="The Forge Flow" width="800" />
</p>

<h1 align="center">The Forge Flow</h1>

<p align="center">
  Autonomous coding agent orchestrator for Claude Code.<br/>
  SQLite-backed state. Plannotator reviews. Wave-based parallel execution.
</p>

<p align="center">
  <a href="#install">Install</a> |
  <a href="#features">Features</a> |
  <a href="#workflow">Workflow</a> |
  <a href="#commands">Commands</a> |
  <a href="#architecture">Architecture</a>
</p>

---

## What is The Forge Flow?

The Forge Flow (`tff-cc`) is a Claude Code plugin that orchestrates AI agents through a structured software development lifecycle. It coordinates 4 lean agents and 18 skills from project initialization to shipped code.

<a name="install"></a>

## Install

Requires **Node.js 20+** and **Git**. Optionally install **plannotator** for interactive review UI.

### Step 1: Install plannotator

```bash
claude /plugin marketplace add backnotprop/plannotator
claude /plugin install plannotator@plannotator
```

### Step 2: Install The Forge Flow

```bash
claude /plugin marketplace add MonsieurBarti/tff-mono
claude /plugin install tff-cc@the-forge-flow
```

Verify: Run `/tff:help` in Claude Code to see the command reference.

The plugin is pulled from the repo's `release` branch, which ships a pre-built distribution — no manual build required on the consumer side.

<a name="features"></a>

## Features

- **SQLite state** — zero-dependency local state management with automatic persistence
- **Wave-based execution** — tasks are topologically sorted into waves; independent tasks run in parallel
- **Fresh reviewer enforcement** — code reviewers are never the same agent that wrote the code
- **Plannotator integration** — all plan reviews, verification, and code reviews go through an interactive browser UI
- **Complexity tiers** — S (quick fix), SS (feature), SSS (complex) determine which phases are required
- **Checkpoint/resumability** — pause and resume execution across sessions
- **Skill library** — 18 reusable methodology skills that agents load for consistent practices
- **Autonomous flow** — `plan-to-pr` mode auto-runs from plan approval through PR creation, with escalation on failure
- **Auto-learn pipeline** — observes tool-use patterns, ranks candidates, drafts skills with bounded guardrails

<a name="workflow"></a>

## Workflow

A complete cycle from idea to shipped code:

```
/tff:new              # Initialize project
/tff:new-milestone    # Start a milestone
/tff:discuss          # Brainstorm and scope the next slice
/tff:research M01-S01 # (optional) Investigate technical approach
/tff:plan M01-S01     # Decompose into tasks, review in plannotator
/tff:execute M01-S01  # Run waves: tests first, then implementation
/tff:verify M01-S01   # Check acceptance criteria
/tff:ship M01-S01     # Two-stage review, then PR and merge
```

Repeat for each slice. When the milestone is complete:

```
/tff:audit-milestone
/tff:complete-milestone   # Final review and merge to main
```

Quick fixes skip the full cycle:

```
/tff:quick "Fix null pointer in user validation"
```

<a name="commands"></a>

## Commands

### Project Lifecycle

| Command              | Description              |
| -------------------- | ------------------------ |
| `/tff:new`           | Initialize a new project |
| `/tff:new-milestone` | Start a new milestone    |
| `/tff:progress`      | Show status dashboard    |
| `/tff:status`        | Lightweight status       |

### Slice Lifecycle

| Command                         | Description                           |
| ------------------------------- | ------------------------------------- |
| `/tff:discuss`                  | Brainstorm and scope a slice          |
| `/tff:research [slice-id]`      | Research phase                        |
| `/tff:plan [slice-id]`          | Plan and create tasks                 |
| `/tff:execute [slice-id]`       | Execute with wave parallelism         |
| `/tff:verify [slice-id]`        | Verify acceptance criteria            |
| `/tff:ship [slice-id]`          | PR review and merge slice             |
| `/tff:quick <description>`      | Fast-track S-tier changes             |
| `/tff:debug <error or symptom>` | Diagnose and fix a bug systematically |

### Milestone Lifecycle

| Command                   | Description            |
| ------------------------- | ---------------------- |
| `/tff:audit-milestone`    | Audit against intent   |
| `/tff:complete-milestone` | Final review and merge |

### Management

| Command                    | Description                        |
| -------------------------- | ---------------------------------- |
| `/tff:add-slice`           | Add slice to milestone             |
| `/tff:insert-slice`        | Insert between slices              |
| `/tff:remove-slice`        | Remove future slice                |
| `/tff:rollback [slice-id]` | Revert slice commits               |
| `/tff:pause`               | Save checkpoint                    |
| `/tff:resume`              | Restore from checkpoint            |
| `/tff:sync`                | Regenerate STATE.md                |
| `/tff:health`              | Diagnose state consistency         |
| `/tff:settings`            | View and modify project settings   |
| `/tff:map-codebase`        | Analyze codebase and generate docs |
| `/tff:help`                | Show command reference             |

<a name="architecture"></a>

## Architecture

```
packages/core/
  src/
    domain/     # Shared domain layer (state machine, schema, contracts)
    shared/     # Content, migrations, and shared assets
apps/tff-cc/
  .claude-plugin/   # Marketplace manifest
  commands/         # 30 slash commands (.md)
  agents/           # 4 lean identity-only agents (.md)
  skills/           # 18 reusable methodology skills
  workflows/        # 23 orchestration workflows (.md)
  references/       # Reference documents (.md)
  src/
    application/    # Use cases (orchestrate via local ports)
    infrastructure/ # Adapters (SQLite, git CLI, filesystem)
    cli/            # CLI entry point
  dist/             # Compiled CLI and native bindings
apps/tff-pi/        # PI coding agent integration (parallel client)
```

`packages/core` owns domain models, state machine, schema, and migrations. `apps/tff-cc` owns the Claude-Code-specific CLI, adapters, and port wiring. Both evolve in lockstep toward functional parity.

For the full product documentation, architecture deep-dive, and agent/skill catalog, see [`apps/tff-cc/README.md`](apps/tff-cc/README.md).

## License

MIT
