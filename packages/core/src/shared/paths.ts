/**
 * Centralized path constants and helpers for tff state.
 *
 * The in-repo `.tff/` directory is a symlink to `~/.tff/{projectId}/`
 * once a project is initialized via `project:init`. All production TS code
 * should build paths via these helpers so that the literal string lives in
 * exactly one place.
 */

/**
 * Canonical in-repo path for tff's state symlink. Appears as a symlink
 * to ~/.tff/{projectId}/ when a project is initialized via project:init.
 */
export const TFF_DIR = ".tff";

// --- Path builders ---------------------------------------------------------

/** Join one or more path segments under the tff state directory. */
export const tffPath = (...parts: string[]): string => [TFF_DIR, ...parts].join("/");

/** Milestone dir: .tff/milestones/{milestoneLabel} */
export const milestoneDir = (milestoneLabel: string): string =>
	tffPath("milestones", milestoneLabel);

/** Slice dir: .tff/milestones/{milestone}/slices/{slice} */
export const sliceDir = (milestoneLabel: string, sliceLabel: string): string =>
	tffPath("milestones", milestoneLabel, "slices", sliceLabel);

/** Worktree dir: .tff/worktrees/{sliceLabel} */
export const worktreeDir = (sliceLabel: string): string => tffPath("worktrees", sliceLabel);

/** Observations dir: .tff/observations */
export const OBSERVATIONS_DIR = tffPath("observations");

/** Settings file: .tff/settings.yaml */
export const SETTINGS_FILE = tffPath("settings.yaml");

/** Project manifest: .tff/PROJECT.md */
export const PROJECT_FILE = tffPath("PROJECT.md");

/** STATE.md at root: .tff/STATE.md */
export const STATE_FILE = tffPath("STATE.md");

/** Milestones dir: .tff/milestones */
export const MILESTONES_DIR = tffPath("milestones");

/** SQLite state DB: .tff/state.db */
export const STATE_DB_FILE = tffPath("state.db");

/** Quick bucket: .tff/quick */
export const QUICK_DIR = tffPath("quick");

/** Debug bucket: .tff/debug */
export const DEBUG_DIR = tffPath("debug");

/** Quick slice dir: .tff/quick/{label} */
export const quickSliceDir = (sliceLabel: string): string => tffPath("quick", sliceLabel);

/** Debug slice dir: .tff/debug/{label} */
export const debugSliceDir = (sliceLabel: string): string => tffPath("debug", sliceLabel);

/**
 * Dispatch slice dir by kind. Milestone-bound slices live under
 * .tff/milestones/{milestoneLabel}/slices/{sliceLabel}; ad-hoc quick/debug
 * slices live under their dedicated buckets.
 */
export const sliceDirFor = (
	slice: { kind: "milestone" | "quick" | "debug" },
	milestoneLabel: string | undefined,
	sliceLabel: string,
): string => {
	if (slice.kind === "milestone") {
		if (!milestoneLabel) {
			throw new Error("sliceDirFor: milestoneLabel required when slice.kind === 'milestone'");
		}
		return sliceDir(milestoneLabel, sliceLabel);
	}
	if (slice.kind === "quick") return quickSliceDir(sliceLabel);
	return debugSliceDir(sliceLabel);
};
