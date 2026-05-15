---
name: grill-with-docs
description: "Use during discuss-slice and plan-slice to stress-test a spec or plan against domain vocabulary before approval."
version: "1.0.0"
tags: [process, review]
---

# Grill with Docs

## When to Use in tff

During `discuss-slice` (stress-test the spec) and `plan-slice` (stress-test the plan). Validates that proposed designs align with documented vocabulary and boundaries.

## Calibration Dial

Default to **light-touch** grilling. Escalate to **full grill** only when:

- The plan touches multiple modules or state models
- Domain terminology is sparse or recently changed
- The user explicitly requests deep scrutiny

## Workflow

### 1. Read Domain Documentation

Load `CONTEXT.md`, `DOMAIN.md`, or equivalent. Note defined terms, boundaries, and invariants.

### 2. Interrogate Sequentially

For each claim in the spec or plan:

- Does the terminology match the domain glossary?
- Are entity relationships fully specified?
- What invented edge cases expose hidden complexity?
- Can every behavioral claim be corroborated by existing implementation?

### 3. Disambiguate and Record

When nomenclature crystallizes during grilling, add it to the glossary immediately. The glossary must remain devoid of implementation details.

When a decision would be hard to reverse, surprises future maintainers absent context, or emerges from authentic trade-offs, draft a decision record in `docs/adr/`.

### 4. Summarize Findings

Present gaps, conflicts, and recommended fixes. Do not block approval for minor terminology mismatches — flag them for correction during execution.

## Constraints

- Probe boundaries with invented edge cases, but flag when they may not match the user's actual domain
- All ambiguities require disambiguation into sharper forms
- Record new terms immediately; do not let informal language persist
