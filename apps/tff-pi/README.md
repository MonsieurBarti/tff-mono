<div align="center">
  <img src="https://raw.githubusercontent.com/MonsieurBarti/The-Forge-Flow-CC/refs/heads/main/assets/forge-banner.png" alt="The Forge Flow" width="100%">

  <h1>🔧 TFF PI Extension</h1>

  <p>
    <strong>The Forge Flow — PI coding agent extension</strong>
  </p>

  <p>
    <a href="https://github.com/MonsieurBarti/tff-mono/actions/workflows/ci.yml">
      <img src="https://img.shields.io/github/actions/workflow/status/MonsieurBarti/tff-mono/ci.yml?label=CI&style=flat-square" alt="CI Status">
    </a>
    <a href="https://www.npmjs.com/package/@the-forge-flow/tff-pi">
      <img src="https://img.shields.io/npm/v/@the-forge-flow/tff-pi?style=flat-square" alt="npm version">
    </a>
    <a href="LICENSE">
      <img src="https://img.shields.io/github/license/MonsieurBarti/tff-mono?style=flat-square" alt="License">
    </a>
  </p>
</div>

---

## What is TFF PI?

TFF PI is a [PI coding agent](https://github.com/earendil-works/pi-coding-agent) extension that brings **The Forge Flow** lifecycle management into your IDE. It coordinates AI-assisted software development through structured phases — from brainstorming to shipping — with full project state tracking.

## Ecosystem

TFF PI is part of the TFF monorepo:

| Package                   | Role                                                            |
| ------------------------- | --------------------------------------------------------------- |
| **tff-pi** (this package) | PI extension — slash commands, AI tools, UI integration         |
| **tff-cc**                | Claude Code CLI adapter — headless execution, subagent dispatch |
| **@tff/core**             | Shared domain model, artifacts, and state primitives            |

## Installation

```bash
pi install npm:@the-forge-flow/tff-pi
```

Then reload PI with `/reload`.

## Commands

### Project lifecycle

- `/tff init` — Initialize TFF in the current Git repository
- `/tff new [name]` — Start a new project (AI-assisted brainstorm)
- `/tff new-milestone [name]` — Create a new milestone

### Slice workflow

- `/tff discuss [sliceId]` — Run the discuss phase on a slice
- `/tff research [sliceId]` — Run the research phase on a slice
- `/tff plan [sliceId]` — Run the plan phase on a slice
- `/tff execute [sliceId]` — Run the execute phase (wave-based task dispatch)
- `/tff verify [sliceId]` — Run verification (AC check + tests)
- `/tff review [sliceId]` — Run code + security review on the slice diff
- `/tff ship [sliceId]` — Open the slice PR and run CI
- `/tff ship-merged [sliceId]` — You merged the PR: cleanup worktree + close slice
- `/tff ship-changes [sliceId] <feedback>` — Reviewer requested changes: reopen for fixes
- `/tff ship-fix [sliceId]` — Apply an inline fix from REVIEW_FEEDBACK.md

Phases end with a printed `→ Next: /tff <phase> M##-S##` hint. Type what it shows to advance.

### Milestone completion

- `/tff complete-milestone [M01]` — Create milestone PR after all slices ship
- `/tff complete-milestone-merged [M01]` — Milestone PR merged: cleanup + close
- `/tff complete-milestone-changes [M01] <feedback>` — Milestone PR needs changes

### Operational

- `/tff status` — Show current project status
- `/tff progress` — Show detailed progress table
- `/tff logs [M01-S01] [--json]` — Show event timeline for a slice
- `/tff health` — Quick database health check
- `/tff doctor` — Full project diagnosis (DB, Git, worktrees, agents)
- `/tff recover` — Crash recovery: scan for stuck slices and offer fixes
- `/tff settings` — Show current settings
- `/tff settings set <key> <value>` — Change a setting
- `/tff state rename <newCodeBranch>` — Rename the TFF state branch
- `/tff branch rename <newCodeBranch>` — Rename the current Git branch
- `/tff help` — Show this help

## Project Home

TFF stores all live project state under `~/.tff/{projectId}/` on your machine. Your repository carries two things:

- **`.tff-project-id`** (tracked) — a single-line UUID that anchors your repo to its project home.
- **`.tff/`** (gitignored) — a symlink pointing to `~/.tff/{projectId}/`. All TFF paths like `.tff/state.db`, `.tff/milestones/…`, `.tff/settings.yaml` resolve through this symlink.

This means your working tree stays clean: no database, no logs, no session locks in the repo.

### `TFF_HOME` env variable

Override the `~/.tff/` root with `TFF_HOME`:

```bash
export TFF_HOME=/my/shared/tff-homes
```

Useful for tests, CI, or shared-disk environments.

### Platform support

macOS and Linux. Windows support requires Developer Mode (for symlinks).

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Lint & format
pnpm run lint
pnpm run format

# Type check
pnpm run typecheck

# Build for publish
pnpm run build
```

### Stack

- **TypeScript** — ES2022 target with strict mode
- **oxlint / oxfmt** — Fast linting and formatting
- **Vitest** — Testing framework
- **Lefthook** — Git hooks for conventional commits
- **pnpm** — Package management

## Project Structure

```
src/
├── index.ts              # Extension entry point
├── commands/             # Slash command handlers
├── tools/                # AI tool registrations
├── phases/               # Phase module implementations
├── common/               # Shared utilities (DB, Git, events, etc.)
├── resources/            # Protocols and skills
└── orchestrator.ts       # Phase dispatch and context building
tests/
├── unit/                 # Unit tests
└── integration/          # Integration tests
```

## License

MIT © [MonsieurBarti](https://github.com/MonsieurBarti)

---

<div align="center">
  <sub>Built with ⚡ by <a href="https://github.com/MonsieurBarti">MonsieurBarti</a></sub>
</div>

---

**Install via npm:** `npm install @the-forge-flow/tff-pi`
