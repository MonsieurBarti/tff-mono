# Next Step Suggestions

Every tff command MUST end with next-step suggestion based on current state.

## State → Suggestion Map

| Current State                         | Suggested Command                                          | Message                                                                                                     |
| ------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Project just created                  | `{{command-prefix}}new-milestone`                          | "Project initialized. Create first milestone with `{{command-prefix}}new-milestone`."                       |
| Milestone created, ¬ slices           | `{{command-prefix}}discuss`                                | "Milestone ready. Start scoping first slice with `{{command-prefix}}discuss`."                              |
| Slice ∈ `discussing`                  | `{{command-prefix}}discuss`                                | "Continue discussing, ∨ if scope locked, auto-advances to research."                                        |
| Slice ∈ `researching`                 | `{{command-prefix}}research`                               | "Research phase. Run `{{command-prefix}}research` to investigate technical approach."                       |
| Slice ∈ `planning`                    | `{{command-prefix}}plan`                                   | "Ready to plan. Run `{{command-prefix}}plan` to create tasks ∧ review via {{artifact-review}}."             |
| Slice ∈ `executing`                   | `{{command-prefix}}execute`                                | "Execution phase. Run `{{command-prefix}}execute` to start wave-based task execution."                      |
| Slice ∈ `verifying`                   | `{{command-prefix}}verify`                                 | "Verification phase. Run `{{command-prefix}}verify` to check AC."                                           |
| Slice ∈ `reviewing`                   | `{{command-prefix}}ship`                                   | "Ready for review. Run `{{command-prefix}}ship` to create slice PR ∧ run reviews."                          |
| Slice ∈ `completing`                  | (auto)                                                     | "Slice being finalized. Closes automatically after merge."                                                  |
| Slice `closed`, more slices open      | `{{command-prefix}}discuss` ∨ `{{command-prefix}}progress` | "Slice shipped! Run `{{command-prefix}}progress` for status, ∨ `{{command-prefix}}discuss` for next slice." |
| All slices `closed`, no passing audit | `{{command-prefix}}audit-milestone`                        | "All slices complete. Run `{{command-prefix}}audit-milestone` to record readiness."                         |
| All slices `closed`, audit `ready`    | `{{command-prefix}}complete-milestone`                     | "Audit passed. Run `{{command-prefix}}complete-milestone` to create milestone PR."                          |
| Milestone `closed`                    | `{{command-prefix}}new-milestone`                          | "Milestone shipped! Start next with `{{command-prefix}}new-milestone`."                                     |

## Usage

At end of every workflow, add:

```
### Next Step
Read current state and suggest appropriate next command from @references/next-steps.md.
```

## Paused/Resumed States

| State                | Suggested Command           |
| -------------------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| Checkpoint ∃         | `{{command-prefix}}resume`  | "Found saved checkpoint. Run `{{command-prefix}}resume` to continue from where left off."  |
| Verification failed  | `{{command-prefix}}execute` | "Verification found issues. Run `{{command-prefix}}execute` to fix ∧ re-run failed tasks." |
| PR changes requested | `{{command-prefix}}ship`    | "Review requested changes. Run `{{command-prefix}}ship` to apply fixes ∧ re-review."       |
