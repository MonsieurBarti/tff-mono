---
name: writing-plans
description: "Use when creating implementation plans. Break specs into bite-sized tasks (2-5 min each)."
version: "1.0.0"
tags: [process, planning]
---

# Writing Plans

## When to Use

∀ plan workflow, after spec approved.

## HARD-GATE

∀ task ∈ plan: must have exact file path, complete code snippet, exact command to run, expected output. "Assumes engineer has zero context ∧ questionable taste."

## Task Granularity

Each task = 1 action (2-5 minutes):

- "Write failing test for X" = 1 task
- "Run test, observe FAIL" = 1 task
- "Implement minimal code to pass" = 1 task
- "Run test, observe PASS" = 1 task
- "Commit with message Y" = 1 task

¬combine multiple actions into one task. ¬"implement feature X" (too broad).

## Plan Structure

```
## Wave 0 (parallel)

### T01: Write failing test for [feature]
- **File**: `src/domain/feature.spec.ts`
- **Code**: [exact test code]
- **Run**: `npx vitest run src/domain/feature.spec.ts`
- **Expect**: FAIL — "feature is not defined"
- **AC**: AC1

### T02: Implement [feature]
- **File**: `src/domain/feature.ts`
- **Code**: [exact implementation]
- **Run**: `npx vitest run src/domain/feature.spec.ts`
- **Expect**: PASS — 1/1 tests passing
- **Commit**: `feat(auth/T02): add feature`

## Wave 1 (depends on Wave 0)
...
```

## Wave Assignment Rules

- Tasks with ¬ dependencies -> Wave 0
- Tasks depending on Wave N -> Wave N+1
- Tasks within same wave -> parallelizable
- Detect via topological sort

## Review Loop

1. Write plan -> save PLAN.md
2. Anonymous plan reviewer (fresh subagent, max 3 iterations)
3. Plannotator review (user annotates)
4. Approved -> proceed to execute

## Anti-Patterns

- Tasks without exact file paths ("update the relevant files")
- Tasks without expected output ("tests should pass")
- Combining test-writing ∧ implementation ∈ same task
- Plans that skip TDD steps (standard/complex tasks require them)
- Wave assignments that don't match dependency graph

## Rules

- ∀ task: 1 file, 1 action, 1 commit
- ∀ standard/complex task: TDD steps (write test -> fail -> implement -> pass -> commit)
- Simple tasks: simpler (may combine steps, skip TDD)
- ¬proceed to execute until plan approved

## Tracer-Bullet Ticket Decomposition

When breaking a spec into tasks, prefer vertical slices that traverse every architectural layer over horizontal tiers.

### Vertical Slice Pattern

Each slice is an independently demonstrable end-to-end segment:

```
Schema change → API endpoint → UI component → Integration test
```

Label each slice:

- **HITL** (human-in-the-loop): requires user sign-off before execution
- **AFK** (away-from-keyboard): safe for autonomous execution

### Rules

- Each segment must be independently demonstrable
- A slice that cannot be shown working end-to-end is too large — split it
- Label HITL slices at boundaries where user judgment is required (UI copy, business rules, public API contracts)
- AFK slices may proceed without blocking on human review
- Reference predecessor slices by real task identifiers so blockers are explicit

### Template

```
## Wave N

### T<NN>: <slice-name> [HITL | AFK]
- **Scope**: <one-sentence description>
- **Layers**: schema, API, UI, tests (list affected)
- **Blocked by**: T<NN>, T<NN>
- **Verify**: <exact check that proves the slice works>
```
