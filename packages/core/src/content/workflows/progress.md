# Progress

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Steps

1. SYNC milestone STATE: `tff-tools sync:state --milestone-id <milestone-id>` (if milestone ∃)
2. SYNC quick STATE (if any quick slices ∃): `tff-tools sync:state --kind quick`
   - Probe: `tff-tools slice:list --kind quick` → if data is non-empty, run sync.
3. SYNC debug STATE (if any debug slices ∃): `tff-tools sync:state --kind debug`
   - Probe: `tff-tools slice:list --kind debug` → if data is non-empty, run sync.
4. DISPLAY:
   - `{{project-dir}}/STATE.md`: milestone progress (slices done/total), per-slice status + tasks
   - `{{project-dir}}/quick/STATE.md` (if ∃): in-progress quick tasks
   - `{{project-dir}}/debug/STATE.md` (if ∃): in-progress debug tasks
5. ROUTE by current state:
   - discussing → `{{command-prefix}}discuss` | planning → `{{command-prefix}}plan`
   - executing → `{{command-prefix}}execute` | verifying → `{{command-prefix}}verify`
   - all closed → `{{command-prefix}}complete-milestone`
6. NEXT: @references/next-steps.md
