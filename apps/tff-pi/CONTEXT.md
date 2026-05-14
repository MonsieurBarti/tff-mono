# tff-pi — Domain Context

> This file defines the domain language, bounded context boundaries, and key decisions for the tff-pi application.
>
> Populate the glossary and decisions sections as the domain evolves. Use `/grill-with-docs` to resolve terminology gaps.

## Glossary

| Term         | Definition                                                                                                                                                                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `created`    | Slice status: the slice has been created but the discuss phase has not yet started. Distinct from `discussing` (which requires SPEC.md or REQUIREMENTS.md to exist). Reconciler promotes `created` → `discussing` when artifacts are detected. |
| `discussing` | Slice status: the discuss phase is actively running, evidenced by SPEC.md or REQUIREMENTS.md on disk.                                                                                                                                          |
| `pr_url`     | URL of the pull request associated with a slice. Stored on the `slice` row; set when a slice ships.                                                                                                                                            |
| `log_cursor` | PI-specific tracking of the last-read position in the event log. Kept outside the shared project schema.                                                                                                                                       |

## Bounded Context

- **Scope**: tff-pi application
- **Upstream dependencies**: `packages/core`

## State directory

`.tff/` in the repo root for both tff-cc and tff-pi. No `.pi/.tff/` — the in-repo state directory is always `.tff/`, a symlink to `~/.tff/{projectId}/`. This replaces the legacy `.pi/.tff/` convention.

## Key Decisions

| Decision                           | Rationale                                                                                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `created` retained                 | Slice starts in `created` before the discuss phase artifacts exist. Reconciler promotes to `discussing`.                                                                                          |
| Transitions converged to core      | Single source of truth in `packages/core/src/domain/slice/transitions.ts`. Converged values: `discussing → researching/planning`, `planning → planning/executing`, `shipping → closed/executing`. |
| `pr_url` moved to core             | Generic concept — any agent shipping to a PR needs it.                                                                                                                                            |
| `log_cursor` stays PI-specific     | PI event-log tailing is not a shared concern. Stored outside the shared project schema.                                                                                                           |
| Agents converge to core            | Agent roles (brainstormer, researcher, executor, etc.) are framework-agnostic. Core owns canonical definitions; tff-pi consumes them.                                                             |
| Protocols stay PI-specific         | Phase execution scripts (discuss-interactive, execute, ship-fix) contain framework-specific tool calls and placeholders. Core provides generic base; tff-pi overrides when needed.                |
| State directory unified to `.tff/` | Both apps use `.tff/` in the repo root. No `.pi/.tff/` — the path is framework-agnostic.                                                                                                          |
| `common/*` moves to core           | db, types, state-machine, derived-state, artifacts, preconditions, verify-commands converge to core. Only settings, logger, and project-home stay PI-specific.                                    |
