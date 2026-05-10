# Abstraction Contract

Placeholder vocabulary for client-agnostic content surfaces.

| Placeholder              | Replaces               | Meaning                               |
| ------------------------ | ---------------------- | ------------------------------------- |
| `{{settings-path}}`      | `.tff/settings.yaml`   | Canonical project settings file       |
| `{{command-prefix}}`     | `/tff:`                | User-facing command invocation prefix |
| `{{artifact-review}}`    | `plannotator-annotate` | Artifact review gate tool             |
| `{{quality-model}}`      | `opus`                 | Most capable model tier               |
| `{{balanced-model}}`     | `sonnet`               | Balanced model tier                   |
| `{{budget-model}}`       | `haiku`                | Fastest/cheapest model tier           |
| `{{spawn-agent}}`        | `Agent tool`           | Subagent spawning mechanism           |
| `{{pre-execution-hook}}` | `PreToolUse`           | Pre-execution interception hook       |
| `{{project-root}}`       | repo root              | Monorepo/project root directory       |
