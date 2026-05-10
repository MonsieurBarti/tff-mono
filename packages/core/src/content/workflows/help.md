# Help

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

Display tff command reference:

### Project Lifecycle

| Command                           | Description                |
| --------------------------------- | -------------------------- |
| `{{command-prefix}}new`           | Initialize new tff project |
| `{{command-prefix}}new-milestone` | Start new milestone        |
| `{{command-prefix}}progress`      | Show status dashboard      |

### Slice Lifecycle

| Command                                 | Description                   |
| --------------------------------------- | ----------------------------- |
| `{{command-prefix}}discuss`             | Brainstorm ∧ scope a slice    |
| `{{command-prefix}}research [slice-id]` | Research phase                |
| `{{command-prefix}}plan [slice-id]`     | Plan ∧ create tasks           |
| `{{command-prefix}}execute [slice-id]`  | Execute with wave parallelism |
| `{{command-prefix}}verify [slice-id]`   | Verify acceptance criteria    |
| `{{command-prefix}}ship [slice-id]`     | PR review ∧ create slice PR   |

### Milestone Lifecycle

| Command                                | Description                     |
| -------------------------------------- | ------------------------------- |
| `{{command-prefix}}audit-milestone`    | Audit against original intent   |
| `{{command-prefix}}complete-milestone` | PR review ∧ create milestone PR |

### Management

| Command                                 | Description                            |
| --------------------------------------- | -------------------------------------- |
| `{{command-prefix}}add-slice`           | Add slice to milestone                 |
| `{{command-prefix}}insert-slice`        | Insert between slices                  |
| `{{command-prefix}}remove-slice`        | Remove future slice                    |
| `{{command-prefix}}rollback [slice-id]` | Revert slice commits                   |
| `{{command-prefix}}pause`               | Save checkpoint                        |
| `{{command-prefix}}resume`              | Restore from checkpoint                |
| `{{command-prefix}}sync`                | Regenerate STATE.md from SQLite        |
| `{{command-prefix}}health`              | Diagnose state consistency             |
| `{{command-prefix}}settings`            | Configure model profiles               |
| `{{command-prefix}}detect-patterns`     | Extract ∧ rank tool-use patterns       |
| `{{command-prefix}}suggest-skills`      | Show pattern candidates with summaries |
| `{{command-prefix}}create-skill`        | Draft a skill from a pattern           |
| `{{command-prefix}}learn`               | Propose refinements to existing skills |
| `{{command-prefix}}compose`             | Propose skill bundles ∨ agents         |
