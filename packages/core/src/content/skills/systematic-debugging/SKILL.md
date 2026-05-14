---
name: systematic-debugging
description: "Use when debugging. 4-phase investigation, root cause, minimal fix."
version: "1.0.0"
tags: [debugging, process]
---

# Systematic Debugging

## When to Use

∀ debug workflow: load this skill. Drives investigation -> root cause -> minimal fix.

## HARD-GATE

¬guess. ∀ hypothesis: verify before proposing a fix. ¬fix symptoms.

## Phase Model

### Phase 1: Investigation

- Track A (Reproducible): PARSE error -> READ implicated code (+-30 lines) -> TRACE call chain
- Track B (Symptom-based): CLARIFY expected vs actual -> REPRODUCE reliably -> NARROW via binary search

### Phase 2: Pattern Analysis

- Find working examples of similar code
- Identify differences: "what works vs what doesn't?"
- Compare code paths, inputs, state

### Phase 3: Hypothesis

- Form hypothesis from pattern analysis
- ∀ hypothesis: predict what you expect to see if true
- Verify prediction with targeted instrumentation

### Phase 4: Implementation

- ROOT CAUSE: identify the minimal change that resolves it
- Defense-∈-depth: multiple overlapping protections, ¬single-point fixes
- Condition-based waiting: replace sleep/polling with event-driven checks

## Escalation

- Stall after 3 failed hypotheses -> escalate to user with findings
- Blocked agents create follow-up task ∧ notify lead — work never silently stalls

## Anti-Patterns

- Guessing without verifying hypothesis
- Fixing symptoms (∅ check "fixes" crash -> ask WHY value was ∅)
- sleep/polling instead of condition-based waiting
- Single-point fix without defense-∈-depth

## Rules

- Fix root cause, ¬symptom
- Minimize blast radius — fix touches as little code as possible
- Document root cause ∈ commit message (¬just "fix bug")
- ∀ investigation step: show user what you found ∧ why it matters
- 3+ fixes attempted -> architectural problem, question the design

## 6-Phase Diagnose Protocol

For hard bugs and performance regressions, apply this disciplined diagnosis loop:

### Phase 1: Reproducible Signal

Construct a fast, deterministic feedback loop. Preferred forms (fastest to slowest):

- Unit test that reproduces the failure
- Minimal script against the suspect module
- Differential harness comparing passing and failing cases
- Integration test with focused scope

Aggressively refine the loop for speed and clarity. The quality of the loop determines the quality of the diagnosis.

### Phase 2: Verify Symptom

Reproduce the failure and validate that it matches the user's reported symptom. If the reproduction diverges, the symptom description is incomplete or incorrect.

### Phase 3: Generate Hypotheses

Produce 3–5 ranked, falsifiable hypotheses following the template:

> If **X** is the cause, then changing **Y** will make the bug disappear / changing **Z** will make it worse.

Show the ranked list to the user before testing.

### Phase 4: Instrument Predictions

Map each probe to a specific prediction. Prefer debuggers over broad logging. Any temporary logs must carry a unique tag such as `[DEBUG-a4f2]`.

### Phase 5: Regression Test

When a correct seam exists, write the regression test first, then apply the fix. If no adequate seam is available, document that architectural shortcoming.

### Phase 6: Post-Mortem

Remove all instrumentation. Rerun the original reproduction. Ask: "What would have prevented this bug?" Escalate architectural gaps to architecture review.
