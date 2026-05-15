# Ultrareview Report — feat/53-common-deletion-types-state-machine

**Date:** 2026-05-15
**Pipeline:** finding (10 subagents) → verification → synthesis

## Summary

- **Total findings:** 16
- **By severity:** Critical: 0 | High: 1 | Medium: 6 | Low: 9
- **By category:** Bug: 3 | Security: 3 | Performance: 2 | Test Coverage: 2 | Consistency: 6

The branch introduces the common-deletion-types state-machine convergence and the artifacts/verify-commands migration. The most severe issue is a **High-severity Windows incompatibility** in `artifact-io.ts` that would block all artifact I/O on Windows. Beyond that, `artifact-io.ts` is the primary hotspot: it contains 5 of the 16 findings (including the lone High), is entirely untested, and has multiple security and performance gaps in its path-safety guard.

## Top Priority (5 highest)

1. **[bug] `packages/core/src/shared/artifact-io.ts:12`** — High/0.90 — `safeTffPath` uses a hard-coded `/` separator, causing false-positive "Path traversal detected" errors on Windows and blocking all artifact I/O.
2. **[coverage] `packages/core/src/shared/artifact-io.ts`** — Medium/0.95 — The entire `artifact-io.ts` module has zero direct unit tests after migration to `packages/core`.
3. **[performance] `packages/core/src/shared/artifact-io.ts:31-35`** — Medium/0.90 — `writeArtifact` calls `mkdirSync(..., { recursive: true })` before every write, causing redundant syscalls when multiple artifacts land in the same slice directory.
4. **[security] `packages/core/src/shared/artifact-io.ts:10-14`** — Medium/0.85 — Empty string `""`, `"."`, and `"./"` resolve to the `.tff` root and bypass the path-traversal guard, allowing read/write/delete on the sandbox directory itself.
5. **[bug] `packages/core/src/shared/artifact-io.ts:43-47`** — Medium/0.75 — `readArtifact` catches all errors as `null`, masking `EACCES`, `EMFILE`, and I/O failures so downstream phase-gating logic treats them as "file missing".

## Findings

### High

#### [bug] `safeTffPath` Windows incompatibility — `packages/core/src/shared/artifact-io.ts:12`

**Confidence:** 0.90 (2 reviewers agreed)
**Description:** The path-safety guard uses `fullPath.startsWith(\`${tffRoot}/\`)`with a hard-coded forward slash. On Windows,`path.resolve()`produces backslash-separated paths (e.g.,`C:\project\.tff\foo`), so every valid child path fails the prefix check and triggers a false-positive `Path traversal detected`error. This effectively blocks all artifact I/O on Windows except the exact`.tff`root.
**Trigger / Exploit / Impact:** On Windows, any call to`writeArtifact`, `readArtifact`, `deleteArtifact`, or `artifactExists`with a non-root relative path will throw "Path traversal detected", making the state-machine artifact system unusable.
**Fix:** Use`path.normalize()`and compare with`path.sep`or a regex that handles both separators, e.g.`!fullPath.startsWith(tffRoot + path.sep)`.

### Medium

#### [coverage] `artifact-io.ts` entirely untested in core — `packages/core/src/shared/artifact-io.ts`

**Confidence:** 0.95 (2 reviewers agreed)
**Description:** The file was moved to `packages/core` but no `packages/core/tests/shared/artifact-io.spec.ts` was created. `safeTffPath`, `writeArtifact`, `readArtifact`, `deleteArtifact`, and `artifactExists` have zero direct unit tests. Only indirect coverage exists (if any) via tff-pi integration paths.
**Trigger / Exploit / Impact:** Without unit tests, the Windows bug, empty-string bypass, and TOCTOU symlink issues can regress silently.
**Fix:** Add `artifact-io.spec.ts` covering path traversal guards, empty-string rejection, round-trip write/read/delete, and Windows path handling.

#### [performance] Redundant `mkdirSync` on every `writeArtifact` — `packages/core/src/shared/artifact-io.ts:31-35`

**Confidence:** 0.90 (2 reviewers agreed)
**Description:** `writeArtifact` calls `mkdirSync(dirname(fullPath), { recursive: true })` before every `writeFileSync`. When finalizers write 3–5 artifacts to the same slice directory, this performs identical redundant syscalls.
**Trigger / Exploit / Impact:** Measurable syscall overhead during phase finalization; scales linearly with artifact count per slice.
**Fix:** Either skip `mkdirSync` when the parent already exists, or provide a batched `writeArtifacts` helper that mkdirs once.

#### [security] `safeTffPath` empty-string / dot bypass — `packages/core/src/shared/artifact-io.ts:10-14`

**Confidence:** 0.85 (2 reviewers agreed)
**Description:** Empty string `""`, `"."`, and `"./"` all resolve to the `.tff` root directory via `path.resolve(tffRoot, relativePath)`, and the guard's `fullPath !== tffRoot` check allows them through. `writeArtifact(root, "", "x")` therefore attempts to write the `.tff` path itself as a file. `deleteArtifact(root, "")` targets the `.tff` file/directory. `artifactExists(root, "")` and `readArtifact(root, "")` operate on `.tff` itself.
**Trigger / Exploit / Impact:** A caller passing an empty or dot relative path can read, write, or delete the `.tff` sandbox directory itself, breaking the sandbox boundary.
**Fix:** Reject empty, `.`, and `./` explicitly in `safeTffPath` before the prefix check.

#### [bug] `readArtifact` masks all filesystem errors as `null` — `packages/core/src/shared/artifact-io.ts:43-47`

**Confidence:** 0.75 (2 reviewers agreed)
**Description:** `readArtifact` has a bare `catch { return null; }`. Permission errors (`EACCES`), transient resource exhaustion (`EMFILE`/`ENFILE`), and I/O failures are all treated as "file missing". Downstream phase-gating logic then behaves as if the artifact does not exist, which can cause incorrect status transitions.
**Trigger / Exploit / Impact:** Permission denial or disk errors during finalizer reads silently propagate as "artifact absent", potentially advancing a slice to the next phase when it should have halted.
**Fix:** Only catch `ENOENT` and `ENOTDIR`; re-throw all other errors.

#### [bug] `SLICE_TRANSITIONS` planning self-loop — `packages/core/src/domain/slice/transitions.ts:15`

**Confidence:** 0.70 (2 reviewers agreed)
**Description:** `SLICE_TRANSITIONS` defines `planning: ["planning", "executing"]`, allowing a `planning → planning` self-transition. This is the only self-loop in the matrix and is inconsistent with the linear/gated progression used by the active `nextSliceStatus` logic. Although `canTransitionSlice` and `validateTransition` are currently unused in production code, this transition matrix is exported as the canonical core domain model and would mislead any future consumer.
**Trigger / Exploit / Impact:** Future consumers of `SLICE_TRANSITIONS` may implement state-machine logic that permits invalid planning self-loops, violating the intended linear slice lifecycle.
**Fix:** Remove `"planning"` from the `planning` array so it becomes `["executing"]`.

#### [security] Symlink TOCTOU in artifact I/O — `packages/core/src/shared/artifact-io.ts:10-14`

**Confidence:** 0.70 (1 reviewer)
**Description:** `safeTffPath` normalizes paths syntactically (`path.resolve`) but never resolves symlinks on the filesystem. An attacker who places a symlink inside `.tff` pointing outside the sandbox (e.g., `../.git/config`) would pass the prefix check because the string path stays under `.tff`, but the actual `readFileSync`/`writeFileSync`/`rmSync` call follows the symlink at time-of-use.
**Trigger / Exploit / Impact:** A compromised or maliciously crafted `.tff` directory can be used to read or write files outside the intended sandbox.
**Fix:** Use `realpathSync` (with `native: true`) on both `tffRoot` and `fullPath` before comparing prefixes.

### Low

#### [consistency] Unrelated research file committed — `worktrees/roach-investigation/ROACH-PI-ANALYSIS.md`

**Confidence:** 1.00 (2 reviewers agreed)
**Description:** A 506-line external research document about the `roach-pi` project is committed to the repo under `worktrees/roach-investigation/`. It has no relation to the common-deletion-types state-machine refactor and should not ship with the branch.
**Trigger / Exploit / Impact:** Repository bloat; potential licensing or confidentiality concerns for external research.
**Fix:** Remove the file from the branch before merge.

#### [consistency] `yaml` duplicated in deps and devDependencies — `packages/core/package.json`

**Confidence:** 1.00 (2 reviewers agreed)
**Description:** `yaml: "^2.8.4"` appears in both `dependencies` and `devDependencies` in `packages/core/package.json`. npm will install it once, but the duplication is a packaging hygiene issue.
**Trigger / Exploit / Impact:** Dependency resolution ambiguity; minor package.json maintenance debt.
**Fix:** Remove it from `devDependencies`.

#### [consistency] Split `@tff/core` imports (value + type) — `apps/tff-pi/src/commands/status.ts:6,10`, `doctor.ts:22,23`, `recover.ts:16,17`

**Confidence:** 0.95 (2 reviewers agreed)
**Description:** Three command files contain two separate import statements from `@tff/core`—one for values and one for types. This violates the `import/no-duplicates` convention and produces unnecessary noise.
**Trigger / Exploit / Impact:** Lint noise; import bloat; reduced readability.
**Fix:** Collapse each pair into a single `import { …, type … } from "@tff/core"`.

#### [coverage] `detectVerifyCommands` resilience branches untested — `packages/core/src/shared/verify-commands.ts`

**Confidence:** 0.90 (2 reviewers agreed)
**Description:** The Husky `.husky/pre-commit` detection branch and all four `try/catch` resilience blocks (GitHub Actions YAML, Lefthook YAML, Husky shell, package.json JSON) have zero test coverage. Note: `detectVerifyCommands` is currently dead code in the monorepo.
**Trigger / Exploit / Impact:** If the dead code is revived, error-handling branches will be untested and likely contain latent bugs.
**Fix:** Add `verify-commands.spec.ts` with tests for corrupt YAML, missing files, and Husky parsing.

#### [consistency] Test files not renamed after source renames — `packages/core/tests/slice/state-machine.spec.ts`, `apps/tff-pi/tests/unit/common/types.spec.ts`

**Confidence:** 0.85 (2 reviewers agreed)
**Description:** `state-machine.spec.ts` tests functions now living in `derived-state.ts` and `next-slice-status.ts`. `types.spec.ts` tests `dto.ts`. Neither spec filename matches its source file, breaking the 1-to-1 file↔spec convention.
**Trigger / Exploit / Impact:** Cognitive overhead when locating tests; risk of orphaned or duplicate test files during future refactors.
**Fix:** Rename to `derived-state.spec.ts` (or split) and `dto.spec.ts` respectively.

#### [security] `verify-commands` substring false-positives — `packages/core/src/shared/verify-commands.ts:184`

**Confidence:** 0.80 (2 reviewers agreed)
**Description:** `isVerificationCommand` uses `lower.includes(kw)` against a keyword list containing `"test"`, `"lint"`, `"check"`, etc. This produces false positives (e.g., a workflow step `curl https://test.example.com` matches `"test"`). Note: `detectVerifyCommands` is currently dead code in the monorepo.
**Trigger / Exploit / Impact:** If revived, verification-command detection would flag unrelated workflow steps, producing noisy or incorrect artifact verification metadata.
**Fix:** Match against command tokens or boundaries (e.g., `cmd.split(/\s+/).includes(kw)` or regex word boundaries).

#### [consistency] `nextSliceStatus` name collision — `packages/core/src/domain/slice/next-slice-status.ts` vs `apps/tff-pi/src/common/transition-helpers.ts`

**Confidence:** 0.80 (2 reviewers agreed)
**Description:** Core exports `nextSliceStatus(current, tier, phaseRuns, _artifacts)` with four parameters. tff-pi keeps a local `nextSliceStatus(current, tier?)` with one to two parameters. Both are currently unused in production code, but the identical name with incompatible signatures is confusing and could cause import collisions if tff-pi ever re-exports the file.
**Trigger / Exploit / Impact:** Future refactor that activates either function risks silent signature mismatch or import collision.
**Fix:** Rename the tff-pi dead-code variant to `linearNextSliceStatus` or delete the file.

#### [consistency] `PIPELINE_PHASE_ORDER` requires new `readonly string[]` cast — `apps/tff-pi/src/common/derived-state.ts:19`

**Confidence:** 0.80 (1 reviewer)
**Description:** The core `phase.value-object.ts` defines `PIPELINE_PHASE_ORDER` with `as const` instead of the previous `readonly Phase[]` explicit annotation. The tff-pi consumer now needs `(PIPELINE_PHASE_ORDER as readonly string[]).indexOf(current)` to satisfy TypeScript, where the old annotated type accepted `.indexOf(current)` without a cast. A matching cast already exists inside core's own `phase.value-object.ts`.
**Trigger / Exploit / Impact:** Minor typing friction at every consumer site; inconsistency between core and tff-pi conventions.
**Fix:** Either add a runtime `readonly string[]` type annotation back to the core export, or accept the cast as a minor typing artifact.

#### [performance] `yaml` eager-loaded via barrel export — `packages/core/src/shared/index.ts`, `packages/core/src/index.ts`

**Confidence:** 0.60 (2 reviewers agreed)
**Description:** `detectVerifyCommands` is re-exported through the `@tff/core` barrel. Because `index.ts` uses `export * from "./shared/index.js"`, importing any symbol from `@tff/core` causes Node.js ESM to evaluate `shared/index.js`, which evaluates `verify-commands.js`, which eagerly imports `yaml`. Note: `detectVerifyCommands` is currently dead code.
**Trigger / Exploit / Impact:** Any import from `@tff/core` pays the `yaml` parse/compile cost at module load time, even when `yaml` is never used.
**Fix:** Either remove the dead re-export, or convert the import to dynamic `import("yaml")` inside the function body.

## Clean Areas

No dimensions were completely clean after verification; findings were confirmed across all five review axes (Bug, Security, Performance, Test Coverage, Consistency).

## Recommendations

1. **Fix `artifact-io.ts` path-safety and testing before merge.** The High-severity Windows bug and the empty-string bypass are both in the same guard function. Refactor `safeTffPath` to use `path.normalize` + `path.sep` (or `realpathSync.native` for symlink defense), add explicit rejection of `""`/`"."`/`"./"`, and ship `artifact-io.spec.ts` covering these cases. This resolves the top 5 priority stack in one module.

2. **Remove dead code and unrelated files.** Drop `worktrees/roach-investigation/ROACH-PI-ANALYSIS.md`, deduplicate `yaml` in `devDependencies`, collapse split `@tff/core` imports, and decide whether to delete or rename the tff-pi `transition-helpers.ts` dead-code variant. These are zero-risk, high-hygiene wins.

3. **Correct the `SLICE_TRANSITIONS` domain model.** Remove the `planning → planning` self-loop in `transitions.ts` before the matrix becomes a relied-upon contract. This is a one-line change with no runtime impact today, but it prevents future consumers from implementing invalid state-machine logic.
