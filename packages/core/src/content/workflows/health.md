# Health

Context: @references/orchestrator-pattern.md ∧ @references/conventions.md

## Steps

1. CHECK {{artifact-review}} installed
2. CHECK state consistency: `tff-tools slice:list` ∧ `tff-tools milestone:list`
   - verify markdown ↔ SQLite mismatches, orphans, worktree integrity
3. CHECK STATE.md sync: `tff-tools state:diff`
   - Parse result:
     - `inSync: true` → row: `| STATE.md sync | OK |`
     - `inSync: false` → row: `| STATE.md sync | DRIFT (see diff) |`
     - report the diff under the table when drift is present
4. CHECK stale-vs-PR status:
   - ∀ non-closed slice from `tff-tools slice:list`:
     - extract slice ID (e.g. `M02-S01`)
     - `gh pr list --state merged --head slice/<slice-id> --json number` → if merged PR ∃ but slice is open:
       - report as stale: `⚠ <slice-id>: slice is <status> but PR #<N> is merged`
   - ∀ non-closed milestone from `tff-tools milestone:list`:
     - if all child slices are closed → report: `⚠ <milestone>: all slices closed but milestone still open`
5. CHECK stale claims: `tff-tools claim:check-stale`
   - Parse result → if `count > 0`:
     - ∀ stale claim: report `⚠ Task <id> (<title>) claimed at <claimedAt> — exceeds 30min TTL`
   - Add row to health report table: `| Stale claims | OK/X stale |`
6. CHECK startup recovery: read `{{project-dir}}/.recovery-marker` if present
   - marker absent → row: `| Recovery | OK |`
   - marker present → read the JSON (`timestamp`, `errorMessage` fields)
     - re-run a throwaway CLI command: `node dist/cli/index.js schema --command slice:list 2>&1 >/dev/null` and capture stderr
     - stderr contains `tff: orphan recovery skipped` → row: `| Recovery | FAILING (see marker) |`; surface `timestamp` + `errorMessage` under the table; leave marker in place
     - stderr is clean → delete `{{project-dir}}/.recovery-marker` and row: `| Recovery | cleared |`
7. CHECK observation liveness: `tff-tools observe:health`
   - Parse result:
     - `data.lastObservation.present === false` → row: `| Last observation | MISSING |`
     - `data.lastObservation.stale === true` → row: `| Last observation | STALE (<lastSeenAt>) |`
     - else → row: `| Last observation | OK |`
     - `data.firstObservationSentinel.shouldWarn === true` → row: `| Observe hook wiring | maybe-unwired — see README §Hook Setup |`
     - else → row: `| Observe hook wiring | OK |`
     - `data.deadLetter.entryCount > 0` → row: `| Observation dead-letter | <entryCount> entries (<bytes> bytes) |`
     - else → row: `| Observation dead-letter | OK |`

8. CHECK skill semantic drift: `tff-tools skills:drift-report`
   - Parse `data.skills`:
     - count rows where `overThreshold === true` → N
     - N === 0 → row: `| Skill semantic drift | OK |`
     - N > 0 → row: `| Skill semantic drift | <N> skills over 0.6 ratio |` and list offending skill ids under the table
     - rows with `error` → informational only; surface under the table as `note: drift ratio unavailable for <id>: <error>`

9. REPORT:

   ```
   | Check | Status |
   |---|---|
   | {{artifact-review}} | OK/MISSING |
   | State consistency | OK/X mismatches |
   | STATE.md sync | OK/DRIFT |
   | Slice-PR sync | OK/X stale slices |
   | Stale claims | OK/X stale |
   | Recovery | OK/FAILING/cleared |
   | Worktrees | OK/X orphans |
   | Last observation | OK/STALE (date)/MISSING |
   | Observe hook wiring | OK/maybe-unwired |
   | Observation dead-letter | OK/N entries |
   | Skill semantic drift | OK/N skills over 0.6 ratio |
   ```

   - Recovery marker present with residual `tff: orphan recovery skipped` warning → report `FAILING` and surface the marker's `timestamp` + `errorMessage` under the table; leave the marker in place for the next run.
   - Recovery marker present and stderr is clean → delete `{{project-dir}}/.recovery-marker` to acknowledge recovery and report `cleared`.

10. stale slices found → ask user: "Close stale slices?" → yes → `tff-tools slice:close --slice-id <id> --reason "PR already merged"`
11. other issues found → offer `{{command-prefix}}sync` to reconcile

12. NEXT: @references/next-steps.md
