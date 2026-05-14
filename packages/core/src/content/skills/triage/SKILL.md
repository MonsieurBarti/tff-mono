---
name: triage
description: "Use ad-hoc to classify the current slice or task into type and readiness state using the tff state model."
version: "1.0.0"
tags: [process, state-management]
---

# Triage

## When to Use in tff

Ad-hoc manual invocation when you need to classify a slice or task before deciding the next action. Maps the current item to tff's state model for consistent tracking.

## Classification Heuristics

### Type

| Type          | Signal                                                               |
| ------------- | -------------------------------------------------------------------- |
| `defect`      | Existing behavior is incorrect, broken, or violates an invariant     |
| `improvement` | New capability, optimization, or refactor that does not fix a defect |

### Readiness States

| State             | Condition                                                   | Next Action                                  |
| ----------------- | ----------------------------------------------------------- | -------------------------------------------- |
| `needs-triage`    | Type and scope are unclear                                  | Gather context, classify type, estimate size |
| `needs-info`      | Missing requirements, reproduction steps, or domain context | Request specific information from user       |
| `ready-for-agent` | Requirements clear, no blockers                             | Proceed to `discuss-slice` or `plan-slice`   |
| `ready-for-human` | Requires user decision or sign-off before proceeding        | Present options and wait for response        |
| `wontfix`         | Out of scope, infeasible, or superseded                     | Document reason and close                    |

## Workflow

### 1. Collect Background

Read the current slice or task description. Check `tff-tools state:diff` for related items.

### 2. Propose Classification

Apply the heuristics above. Present:

- Proposed type (`defect` or `improvement`)
- Proposed readiness state
- Reasoning in one sentence

### 3. Confirm or Adjust

If the user disagrees, adjust the classification. If the state is `needs-info`, list concrete, actionable follow-up questions.

### 4. Record

Update the item's tracking metadata via `tff-tools` or equivalent. Items in `needs-info` return to `needs-triage` once new information arrives.

## Constraints

- One type and one state per item; if they clash, alert the user
- `ready-for-agent` skips questioning but should confirm an agent brief exists
- Do not move directly to execution without planning unless the item is S-tier (single-file fix)
