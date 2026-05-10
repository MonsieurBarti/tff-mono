# tff-pi Content Audit — M02-S07

Inventory of every file under `apps/tff-pi/src/resources/` categorized as `shared`, `app-specific`, or `deprecated`.

## Agents (`apps/tff-pi/src/resources/agents/`)

| File                      | Status       | Note                           |
| ------------------------- | ------------ | ------------------------------ |
| `brainstormer.md`         | app-specific | PI agent                       |
| `code-reviewer.md`        | app-specific | PI agent                       |
| `executor.md`             | app-specific | PI agent                       |
| `inline-fixer.md`         | app-specific | PI agent                       |
| `planner.md`              | app-specific | PI agent                       |
| `researcher.md`           | app-specific | PI agent                       |
| `security-reviewer.md`    | app-specific | PI agent                       |
| `verifier.md`             | app-specific | PI agent                       |
| `tff-code-reviewer.md`    | deprecated   | tff-cc-specific agent; deleted |
| `tff-executor.md`         | deprecated   | tff-cc-specific agent; deleted |
| `tff-fixer.md`            | deprecated   | tff-cc-specific agent; deleted |
| `tff-security-auditor.md` | deprecated   | tff-cc-specific agent; deleted |
| `tff-verifier.md`         | deprecated   | tff-cc-specific agent; deleted |

## Protocols (`apps/tff-pi/src/resources/protocols/`)

| File                     | Status       | Note                                                                                                                                 |
| ------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `discuss-interactive.md` | app-specific | PI tool calls (`tff_classify`, `plannotator_submit_plan`)                                                                            |
| `execute.md`             | app-specific | PI dispatcher references                                                                                                             |
| `plan.md`                | app-specific | PI tool calls (`tff_write_plan`, `plannotator_annotate`)                                                                             |
| `research.md`            | app-specific | PI tool calls (`tff_write_research`)                                                                                                 |
| `review.md`              | shared       | migrated to `packages/core/src/content/protocols/review.md` with abstractions; tff-pi copy deleted after loadResource fallback (T15) |
| `ship-fix.md`            | app-specific | PI tool calls (`tff_ask_user`, `tff_ship_apply_done`)                                                                                |
| `verify.md`              | shared       | migrated to `packages/core/src/content/protocols/verify.md` with abstractions; tff-pi copy deleted after loadResource fallback (T15) |

## Skills (`apps/tff-pi/src/resources/skills/`)

| File                    | Status     | Note                                       |
| ----------------------- | ---------- | ------------------------------------------ |
| `report-issue/SKILL.md` | deprecated | shared duplicate; already in core; deleted |

## Templates (`apps/tff-pi/src/resources/templates/`)

| File         | Status     | Note                                       |
| ------------ | ---------- | ------------------------------------------ |
| `pr-body.md` | deprecated | shared duplicate; already in core; deleted |

## Summary

- **App-specific**: 8 agents + 5 protocols = 13 files
- **Shared**: 2 protocols migrated to core (tff-pi copies deleted after loadResource fallback)
- **Deprecated**: 5 agents + 2 protocols + 1 skill + 1 template = 9 files deleted
- **Zero shared duplicates remain in tff-pi**.
