# Verify Slice

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Prerequisites

status = verifying
LOAD @skills/verification-before-completion/SKILL.md

## Steps

1. LOAD @skills/acceptance-criteria-validation/SKILL.md → SPAWN subagent: {acceptance_criteria from PLAN.md}
   - Verify each criterion against implementation
     LOAD @skills/plannotator-usage/SKILL.md

2. plannotator-annotate Review (REQUIRED gate)
   **REQUIRED — do NOT proceed past this step until annotations are resolved.**
   This is a hard dependency per `the artifact review skill` (no terminal fallback).

   FINDINGS → invoke Skill `plannotator-annotate` with arg `{{project-dir}}/milestones/<milestone>/slices/<slice-id>/VERIFICATION.md`
   - feedback → revise the artifact, re-invoke
   - approved (no annotations ∨ all resolved) → continue
   - skipping this step is ¬ allowed; if plannotator-annotate is unavailable, surface to user ∧ pause

3. VERDICT:
   - PASS → `tff-tools slice:transition --slice-id <id> --status reviewing`
     CHECK: `ok` = true → suggest `{{command-prefix}}ship` | `ok` = false → warn user, offer retry ∨ abort
   - FAIL → ask user: fix (→ back to executing, replan) ∨ accept w/ exceptions (→ reviewing)
4. NEXT: @references/next-steps.md

## Auto-Transition

Read `{{settings-path}}` → `autonomy.mode`.
`plan-to-pr` ∧ ¬HUMAN_GATE → auto-invoke next workflow via `tff-tools workflow:next --status <status>`.
`guided` → suggest next step, wait for user.
Progress: `[tff] <slice-id>: verifying → reviewing`

## Retry (plan-to-pr)

FAIL ∧ attempts < 2 → `git revert`, reload checkpoint, re-execute from failed wave
FAIL ∧ attempts ≥ 2 → `tff-tools` escalation task, pause chain
