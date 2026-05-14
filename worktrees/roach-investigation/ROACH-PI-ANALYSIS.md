# ROACH-PI Deep Investigation — What tff-mono Should Adopt

> Worktree: `../tff-mono-roach-investigation` (external git worktree)
> Output dir: `worktrees/roach-investigation/` (inside tff-mono repo root)
> Repo: https://github.com/tmdgusya/roach-pi
> Date: 2026-05-14

---

## 1. Executive Summary

ROACH-PI is a **pi extension suite** (not a standalone app) that transforms a normal coding session into a **disciplined engineering loop**. It bundles **7 extensions** and **13+ agentic skills** with rich UI integration (footers, widgets, settings panels, health checks).

Our tff-mono is a **standalone monorepo** with a strong event-sourced domain core (`packages/core`), CLI commands (`apps/tff-pi`), and utility skills. The two are complementary: ROACH-PI excels at **in-session agentic discipline**, while tff-mono excels at **project-level milestone/slice orchestration**.

**The highest-impact adoptions for tff-mono are:**

| Priority | Feature                              | Impact                                                             | Effort |
| -------- | ------------------------------------ | ------------------------------------------------------------------ | ------ |
| **P0**   | Workspace Memory System              | Huge — eliminates repeated fixes, builds project knowledge         | Medium |
| **P0**   | Agentic Clarification (`/clarify`)   | Huge — replaces fuzzy `/discuss` with rigorous two-track discovery | Medium |
| **P0**   | Systematic Debugging Skill           | High — replaces ad-hoc diagnose with 7-phase hard-gated workflow   | Low    |
| **P1**   | Agentic Plan Crafting (`/plan`)      | High — structured no-placeholder plans with verification discovery | Medium |
| **P1**   | Agentic Review Work (`/ultrareview`) | High — parallel reviewer pipeline with synthesis                   | Medium |
| **P1**   | Pi Code Previews (rich rendering)    | High — UX upgrade for every tool call                              | Medium |
| **P2**   | FFF Search Override                  | Medium — faster, richer search with pagination                     | Low    |
| **P2**   | Session Loop / Job Scheduler         | Medium — background job support                                    | Low    |
| **P2**   | Context Compaction Hook              | Medium — smarter context window management                         | Low    |
| **P2**   | Nested `AGENTS.md` Injection         | Low-Medium — local conventions per subtree                         | Low    |
| **P3**   | Team Mode                            | Medium — multi-agent tmux panes (experimental)                     | High   |
| **P3**   | Autonomous Dev Engine                | Medium — auto-poll GitHub issues (experimental)                    | High   |

---

## 2. ROACH-PI Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                    ROACH-PI Extension Suite                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Agentic    │  │   Session   │  │   Autonomous Dev    │  │
│  │  Harness    │  │    Loop     │  │   (Experimental)      │  │
│  │  ─────────  │  │  ─────────  │  │  ─────────────────  │  │
│  │  /clarify   │  │  /loop      │  │  Polls GH issues      │  │
│  │  /plan      │  │  /loop-stop │  │  Spawns workers       │  │
│  │  /ultraplan │  │  /loop-list │  │  UI widget + status   │  │
│  │  /ultrareview│  │  /loop-stop-all│  │                     │  │
│  │  ask_user_question │         │  │                     │  │
│  │  harness_milestone │        │  │                     │  │
│  │  harness_state       │      │  │                     │  │
│  │  subagent tool       │      │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   FFF       │  │  Workspace  │  │   Pi Code Previews  │  │
│  │  Search     │  │   Memory    │  │   (rich rendering)  │  │
│  │  ─────────  │  │  ─────────  │  │  ─────────────────  │  │
│  │  Overrides  │  │  /memory    │  │  Shiki highlighting │  │
│  │  find/grep  │  │  memory_save│  │  Diff word emphasis │  │
│  │  Cursor     │  │  Templates  │  │  Secret warnings    │  │
│  │  pagination │  │  Scoring    │  │  Bash warnings      │  │
│  │  Regex fb   │  │  Eviction   │  │  Settings UI        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Nested      │  │   LSP       │  │   Team Mode         │  │
│  │ AGENTS.md   │  │   Client    │  │   (tmux panes)      │  │
│  │  Injection  │  │  (bundled)  │  │   Durable inbox     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Deep Dive: What to Adopt

### 3.1 Workspace Memory System ⭐ P0

**What it is:**
Structured, workspace-scoped memory stored under `~/.pi/agent/workspace-memory/{cwdHash}/`. Each memory is a JSON file with an index. Memories have **templates** (decision, bugfix, discovery, convention, pattern, todo), **tags**, **trigger keywords**, and a **scoring algorithm**.

**Scoring:**

```
score = recallCount × exp(-daysSinceLastRecall / 30)
```

Higher = more valuable. Eviction at 200 memories, lowest score dropped first.

**How it's used:**

- LLM calls `memory_save` tool after bug fixes, decisions, discoveries
- `/memory list/show/save/delete/search/stats` commands
- **Auto-recall**: before agent start, relevant memories are injected into context
- **Crash-safe**: index saved before evicted files deleted

**What tff-mono should do:**

- Build a similar workspace-scoped memory system, but integrate with our event-sourced core
- Use `memory_save` as a tool our agents can call
- Add `/memory` commands to tff-pi CLI
- Connect to our existing `Observation` value object in core — memories are essentially persisted observations

---

### 3.2 Agentic Clarification (`/clarify`) ⭐ P0

**What it is:**
A two-track process that runs in parallel:

| Track       | Purpose              | Method                                                                    |
| ----------- | -------------------- | ------------------------------------------------------------------------- |
| **Track 1** | Ambiguity Resolution | `ask_user_question` tool — ONE question at a time, dynamic choices        |
| **Track 2** | Technical Context    | `subagent` tool with `explorer` agent — investigates codebase in parallel |

**Output:** A structured **Context Brief** with Goal, Scope (In/Out), Technical Context, Constraints, Success Criteria, Open Questions, Complexity Assessment.

**Routing after clarification:**

- Simple (5-8) → `agentic-plan-crafting`
- Complex (9-15) → `agentic-milestone-planning` → `agentic-long-run`
- Borderline (8-9) → present both options

**What tff-mono should do:**

- Replace our `/discuss` command with a rigorous `/clarify` command
- Implement the `ask_user_question` tool (or use pi's built-in if available)
- Add the `agentic-clarification` skill
- Store the Context Brief as a project artifact (maybe link to our SPEC.md generation)

---

### 3.3 Systematic Debugging Skill ⭐ P0

**What it is:**
A 7-phase hard-gated debugging workflow:

1. **Phase 0 — Attempt Reproduction** (MANDATORY first step)
2. **Phase 1 — Define The Problem**
3. **Phase 2 — Reproduce Or Instrument**
4. **Phase 3 — Gather Evidence**
5. **Phase 4 — Isolate Root Cause**
6. **Phase 5 — Lock The Failure** (automated test MUST fail before fix)
7. **Phase 6 — Implement A Single Fix**
8. **Phase 7 — Verify And Close**

**Stop conditions:**

- Reproduction failed after 3 attempts → stop
- Three failed fixes → escalate to human
- No failing guard before fix → stop

**Bundled resources:**

- `condition-based-waiting-example.ts`
- `defense-in-depth.md`
- `find-polluter.sh`
- `root-cause-tracing.md`

**What tff-mono should do:**

- Replace our generic `diagnose` skill with this rigorous, phase-gated skill
- Add the bundled resources
- Integrate with our `evidence-auditor` and `mechanical-verifier`
- Connect to our `tdd` skill for Phase 5 (lock failure with test)

---

### 3.4 Agentic Plan Crafting (`/plan`) ⭐ P1

**What it is:**
Strict skill for creating **executable implementation plans** with:

- **No placeholders** — every task must be actionable
- **Project capability discovery** — scans for bundled/project agents and skills
- **Verification discovery** — identifies how to verify each task before implementation
- **File structure mapping** — maps tasks to files
- **Task format** with agent, task description, verification method

**Plan document structure:**

```markdown
# Plan: {Goal}

## Scope of Work

## Architecture

## File Structure

## Verification Discovery

## Project Capability Discovery

## Task Decomposition

### Task 1: ...

- [ ] **Step**: ...
  - **Verification**: ...

## Final Verification Task
```

**Execution handoff:** `plan-compliance` → `plan-worker` → `plan-validator` subagent loop.

**What tff-mono should do:**

- Upgrade our `/plan` command to use this skill
- Integrate with our existing plan parser and state machine
- Use our `packages/core` domain to store plan state durably (not just markdown)
- The `harness_milestone` / `harness_state` tools pattern is exactly what we need for structured plan tracking

---

### 3.5 Agentic Review Work (`/ultrareview`) ⭐ P1

**What it is:**
A 5-phase review process:

1. **Load and Analyze Plan Document**
2. **Codebase Inspection** — verify against plan, check anti-patterns
3. **Test Execution** — run tests, check coverage
4. **Git History Verification** — check commit quality, reverts
5. **Verdict and Review Document**

**Parallel reviewer dispatch** (ultraplan style):

- Feasibility Analyst
- Architecture Analyst
- Risk Analyst
- Bug Analyst
- Consistency Analyst
- Dependency Analyst
- Performance Analyst
- Security Analyst
- Test-Coverage Analyst
- User-Value Analyst
- Verifier

All run in parallel via `subagent` tool, then synthesized.

**What tff-mono should do:**

- Upgrade our `/review` command to support parallel reviewer agents
- Add reviewer agent definitions to our agent system
- Integrate with our `review-feedback` and `plannotator-review` systems
- Store review verdicts in `packages/core` as `Review` entities

---

### 3.6 Pi Code Previews ⭐ P1

**What it is:**
Rich tool call rendering with:

- **Shiki syntax highlighting** for read/write/edit tool outputs
- **Diff word emphasis** — highlights changed words within lines
- **Secret warnings** — detects API keys, tokens in output
- **Bash warnings** — warns on destructive commands (rm, drop, etc.)
- **Settings UI** — `/code-preview` command opens settings panel
- **Tool-specific renderers** for bash, edit, find, grep, ls, read, write
- **Collapsed lines** — configurable max lines per tool type
- **Path icons** — file type icons in find/ls results

**What tff-mono should do:**

- Build or adopt a similar preview system for our CLI
- Especially valuable for our `/execute`, `/ship`, `/review` commands where we show diffs and code
- Could be a standalone package `packages/code-previews`

---

### 3.7 FFF Search Override ⭐ P2

**What it is:**
Replaces pi's built-in `find` and `grep` tools with FFF implementations:

- `find` → FFF fuzzy file find with frecency ranking
- `grep` → FFF content grep with smart case, regex support, cursor pagination
- Cursor store for paginated results (`cursor="id"`)
- Regex fallback to literal on failure
- `maxMatchesPerFile` limit
- Custom rendering via `renderCall` / `renderResult`

**What tff-mono should do:**

- We already use FFF via context-mode, but this is a **native pi extension** approach
- If we build a pi extension for tff-mono, this pattern shows how to override built-in tools
- For now, our context-mode integration is sufficient; this is lower priority

---

### 3.8 Session Loop / Job Scheduler ⭐ P2

**What it is:**
A simple job scheduler for background tasks:

- `/loop <prompt>` — schedule a follow-up prompt
- `/loop-stop <id>` — stop a job
- `/loop-list` — list active jobs
- `/loop-stop-all` — stop all jobs
- Jobs run via `pi.sendUserMessage(prompt, { deliverAs: 'followUp' })`
- Cleanup on `session_shutdown`

**What tff-mono should do:**

- Add a background job queue to tff-pi
- Useful for long-running `/research`, `/execute` phases that can run async
- Integrate with our existing `subagent-dispatcher` and `async` subagent support

---

### 3.9 Context Compaction Hook ⭐ P2

**What it is:**
Hooks into pi's `session_before_compact` event to compact extension context before pi's own compaction runs.

**What tff-mono should do:**

- If we build a pi extension, implement this hook
- Our context-mode already handles large outputs, but this would help with session state compaction
- Lower priority since context-mode works well

---

### 3.10 Nested `AGENTS.md` Injection ⭐ P2

**What it is:**
Automatically injects nearby directory-level `AGENTS.md` files when the agent reads a file. Each subtree can carry local conventions.

**What tff-mono should do:**

- We already have `AGENTS.md` at root, but nested ones would be powerful
- For example, `apps/tff-pi/AGENTS.md` could define CLI conventions
- `packages/core/AGENTS.md` could define domain model conventions
- Low effort, good value

---

### 3.11 Team Mode ⭐ P3

**What it is:**
Multi-agent team execution with tmux panes:

- Root/orchestrator session creates worker agents
- Workers visible in readable `pi` CLI panes (tmux)
- Durable command inbox for follow-up commands
- Persistence and resume semantics
- Concurrency limits and failure handling
- Data model: `TeamRunOptions`, `TeamTask`, `TeamCommand`, `TeamTerminalMetadata`

**What tff-mono should do:**

- Very interesting but high effort
- Our `subagent-dispatcher` already handles parallel/chain/async modes
- Team mode adds tmux UI and durable inbox — consider for future if we need persistent multi-agent sessions
- Gate behind feature flag (`PI_ENABLE_TEAM_MODE`)

---

### 3.12 Autonomous Dev Engine ⭐ P3

**What it is:**
Polls GitHub issues and auto-spawns workers:

- `/autonomous-dev start <repo>` — start engine
- Poll interval: 60s
- Fetches issue + comments
- Spawns `autonomous-dev-worker` agent
- UI widget showing status, recent activities
- Process cleanup hooks (SIGINT, SIGTERM, exit)

**What tff-mono should do:**

- Interesting for automated issue triage/fixing
- Could integrate with our existing `triage` skill and GitHub issue system
- Experimental — monitor ROACH-PI's maturity before adopting

---

### 3.13 Agentic Skills Ecosystem

ROACH-PI has **13 bundled skills** with rich structure:

| Skill                          | Purpose                            | Bundled Resources             |
| ------------------------------ | ---------------------------------- | ----------------------------- |
| `agentic-clarification`        | Two-track ambiguity resolution     | —                             |
| `agentic-plan-crafting`        | No-placeholder plan creation       | —                             |
| `agentic-milestone-planning`   | Parallel reviewer → milestone DAG  | —                             |
| `agentic-run-plan`             | Structured plan execution          | —                             |
| `agentic-review-work`          | Multi-phase review pipeline        | —                             |
| `agentic-systematic-debugging` | 7-phase debugging                  | `.ts`, `.md`, `.sh` resources |
| `agentic-brainstorming`        | Structured brainstorming           | —                             |
| `agentic-karpathy`             | Karpathy-style code review persona | —                             |
| `agentic-rob-pike`             | Rob Pike-style simplicity review   | —                             |
| `agentic-simplify`             | Code simplification skill          | —                             |
| `agentic-long-run`             | Long-running task harness          | —                             |

**What tff-mono should do:**

- Adopt the skill structure pattern: **Hard Gates, Phases, Transitions, Anti-Patterns, Minimal Checklist**
- Our existing skills (grill-me, tdd, to-issues, triage) are good but less structured
- Rewrite `diagnose` as `agentic-systematic-debugging`
- Add `agentic-clarification`, `agentic-plan-crafting`, `agentic-review-work`
- Consider `agentic-karpathy` and `agentic-rob-pike` for review personas

---

## 4. What tff-mono Already Does Better

| Area                    | tff-mono Advantage                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------ |
| **Event-sourced core**  | `packages/core` with milestones, slices, projects, observations — durable, auditable |
| **State machine**       | Formal transitions with guards, not just markdown tracking                           |
| **PR workflow**         | `ship`, `ship-changes`, `ship-merged` with branch naming, PR templates               |
| **Context-mode**        | FTS5-indexed large output handling — ROACH-PI doesn't have this                      |
| **Lumen visuals**       | Interactive HTML diagrams, charts, guides — ROACH-PI uses static SVGs                |
| **Triage system**       | GitHub issue lifecycle with `needs-triage` → `ready-for-agent` labels                |
| **Plannotator**         | Browser-based annotation and review integration                                      |
| **Evidence auditor**    | Formal evidence collection and verification                                          |
| **Mechanical verifier** | Automated verification commands                                                      |
| **Settings system**     | Per-project settings with UI                                                         |
| **Per-slice logging**   | Isolated logs per work slice                                                         |

**Strategy:** Adopt ROACH-PI's **in-session discipline** and **skills structure**, while keeping our **project-level orchestration** and **domain core** as the foundation.

---

## 5. Recommended Adoption Roadmap

### Phase 1: Foundation (Week 1-2)

1. **Workspace Memory** — build workspace-scoped memory system integrated with `Observation`
2. **Nested AGENTS.md** — implement directory-level AGENTS.md injection
3. **Context Compaction Hook** — add `session_before_compact` handler

### Phase 2: Agentic Discipline (Week 3-4)

4. **Agentic Clarification** — replace `/discuss` with `/clarify`, add `ask_user_question` tool
5. **Systematic Debugging** — rewrite `diagnose` skill as `agentic-systematic-debugging`
6. **Agentic Plan Crafting** — upgrade `/plan` with structured skill, no-placeholder policy

### Phase 3: Quality Gates (Week 5-6)

7. **Agentic Review Work** — add `/ultrareview` with parallel reviewers
8. **Pi Code Previews** — build rich rendering package
9. **Agentic Milestone Planning** — add `/ultraplan` for complex tasks

### Phase 4: Advanced (Week 7-8)

10. **Session Loop** — background job scheduler
11. **FFF Search Override** — if building pi extension
12. **Team Mode / Autonomous Dev** — evaluate and prototype

---

## 6. Integration Sketch

```
┌─────────────────────────────────────────────────────────────────────┐
│                         tff-mono (Future)                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐  │
│  │   tff-pi CLI (apps)     │  │   packages/core (domain)        │  │
│  │  ─────────────────────  │  │  ─────────────────────────────  │  │
│  │  /clarify               │  │  Milestone                      │  │
│  │  /plan (structured)     │  │  Slice (event-sourced)          │  │
│  │  /ultraplan             │  │  Project                        │  │
│  │  /execute               │  │  Observation ←──┐               │  │
│  │  /review /ultrareview   │  │  Review         │               │  │
│  │  /ship                  │  │  Routing        │               │  │
│  │  /memory *NEW*          │  │                 │               │  │
│  │  /loop *NEW*            │  │  WorkspaceMemory│ (new entity)  │  │
│  │  /code-preview *NEW*    │  │                 │               │  │
│  └─────────────────────────┘  └─────────────────┼───────────────┘  │
│  ┌─────────────────────────┐  ┌─────────────────┴───────────────┐  │
│  │   Skills (structured)    │  │   Infra                         │  │
│  │  ─────────────────────  │  │  ─────────────────────────────  │  │
│  │  agentic-clarification  │  │  context-mode (FTS5)            │  │
│  │  agentic-plan-crafting   │  │  lumen (visuals)                │  │
│  │  agentic-run-plan        │  │  plannotator (review)           │  │
│  │  agentic-review-work     │  │  triage (GH issues)             │  │
│  │  agentic-systematic-debug│  │  evidence-auditor               │  │
│  │  agentic-milestone-plan  │  │  mechanical-verifier          │  │
│  │  tdd, grill-me, etc.    │  │  settings-ui                    │  │
│  │  *NEW: karpathy, rob-pike│  │  per-slice-logs                 │  │
│  └─────────────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Files Referenced

| File                                   | Source                                          |
| -------------------------------------- | ----------------------------------------------- |
| `extensions/workspace-memory/`         | ROACH-PI workspace memory implementation        |
| `extensions/agentic-harness/skills/`   | ROACH-PI skill definitions                      |
| `extensions/agentic-harness/index.ts`  | Harness commands, tools, subagent orchestration |
| `extensions/pi-code-previews/`         | Rich tool rendering                             |
| `extensions/session-loop/`             | Job scheduler                                   |
| `extensions/fff-search/`               | Search override                                 |
| `extensions/autonomous-dev/`           | Auto-issue engine                               |
| `docs/engineering-discipline/context/` | Design briefs                                   |
| `apps/tff-pi/src/`                     | tff-mono CLI (current)                          |
| `packages/core/`                       | tff-mono domain core (current)                  |
