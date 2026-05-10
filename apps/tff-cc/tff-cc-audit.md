# tff-cc Content Audit — M02-S07

Inventory of every file under `apps/tff-cc/` content surfaces after sync-bridge installation.

## Agents (`apps/tff-cc/agents/`)

| File                      | Status  | Note                                            |
| ------------------------- | ------- | ----------------------------------------------- |
| `tff-code-reviewer.md`    | derived | synced from `packages/core/src/content/agents/` |
| `tff-executor.md`         | derived | synced from `packages/core/src/content/agents/` |
| `tff-fixer.md`            | derived | synced from `packages/core/src/content/agents/` |
| `tff-outcome-judge.md`    | derived | synced from `packages/core/src/content/agents/` |
| `tff-security-auditor.md` | derived | synced from `packages/core/src/content/agents/` |
| `tff-spec-reviewer.md`    | derived | synced from `packages/core/src/content/agents/` |
| `tff-verifier.md`         | derived | synced from `packages/core/src/content/agents/` |

## Commands (`apps/tff-cc/commands/tff/`)

All 29 `.md` files are **derived** — synced from `packages/core/src/content/commands/`.

## Skills (`apps/tff-cc/skills/`)

| File/Dir                          | Status       | Note                                               |
| --------------------------------- | ------------ | -------------------------------------------------- |
| `acceptance-criteria-validation/` | derived      | synced from core                                   |
| `agent-authoring/`                | derived      | synced from core                                   |
| `architecture-review/`            | derived      | synced from core                                   |
| `brainstorming/`                  | derived      | synced from core                                   |
| `code-review-protocol/`           | derived      | synced from core                                   |
| `codebase-documentation/`         | derived      | synced from core                                   |
| `commit-conventions/`             | derived      | synced from core                                   |
| `create-skill/`                   | derived      | synced from core                                   |
| `executing-plans/`                | derived      | synced from core                                   |
| `finishing-work/`                 | derived      | synced from core                                   |
| `hexagonal-architecture/`         | derived      | synced from core                                   |
| `plannotator-usage/`              | derived      | synced from core                                   |
| `receiving-code-review/`          | derived      | synced from core                                   |
| `report-issue/`                   | derived      | synced from core                                   |
| `security-review/`                | derived      | synced from core                                   |
| `stress-testing-specs/`           | derived      | synced from core                                   |
| `systematic-debugging/`           | derived      | synced from core                                   |
| `test-driven-development/`        | derived      | synced from core                                   |
| `verification-before-completion/` | derived      | synced from core                                   |
| `writing-plans/`                  | derived      | synced from core                                   |
| `skill-authoring/`                | app-specific | tff-cc meta-guidelines; not in core                |
| `skill-baselines.json`            | generated    | produced by sync-content script from core manifest |

## Workflows (`apps/tff-cc/workflows/`)

All 19 `.md` files are **derived** — synced from `packages/core/src/content/workflows/`.

## References (`apps/tff-cc/references/`)

| File                         | Status       | Note                                  |
| ---------------------------- | ------------ | ------------------------------------- |
| `agent-status-protocol.md`   | derived      | synced from core                      |
| `conventions.md`             | derived      | synced from core                      |
| `flag-naming-conventions.md` | derived      | synced from core                      |
| `model-profiles.md`          | derived      | synced from core                      |
| `next-steps.md`              | derived      | synced from core                      |
| `orchestrator-pattern.md`    | derived      | synced from core                      |
| `release-checklist.md`       | app-specific | preserved by sync script; not in core |
| `security-baseline.md`       | derived      | synced from core                      |
| `settings-template.md`       | derived      | synced from core                      |
| `tff-tools-reference.md`     | derived      | synced from core                      |

## Summary

- **Derived**: 7 agents + 29 commands + 20 skills + 19 workflows + 9 references = 84 files
- **App-specific**: 1 skill directory + 1 reference file
- **Generated**: 1 JSON file
- **Zero shared duplicates remain outside `packages/core/src/content/`**.
