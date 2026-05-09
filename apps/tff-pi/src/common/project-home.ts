import { execFileSync } from "node:child_process";
import {
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	readlinkSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DEFAULT_SETTINGS, serializeSettings } from "./settings.js";

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ProjectHomeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ProjectHomeError";
	}
}

export function tffHomeRoot(): string {
	const override = process.env.TFF_HOME;
	if (!override || override.length === 0) return join(homedir(), ".tff");
	if (override.includes("\0")) {
		throw new ProjectHomeError("TFF_HOME contains null byte");
	}
	if (!override.startsWith("/")) {
		throw new ProjectHomeError(`TFF_HOME must be an absolute path, got: ${override}`);
	}
	// Reject path-traversal components. Even though TFF_HOME is user-supplied
	// and thus "trusted", accidental `..` in env setups (e.g., CI scripts that
	// interpolate relative paths) could escape the intended home and clobber
	// files outside it.
	const segments = override.split("/");
	if (segments.includes("..") || segments.includes(".")) {
		throw new ProjectHomeError(
			`TFF_HOME must not contain '.' or '..' path components, got: ${override}`,
		);
	}
	return override;
}

export function isUuidV4(s: string): boolean {
	return UUID_V4_RE.test(s);
}

export function projectHomeDir(projectId: string): string {
	return join(tffHomeRoot(), projectId);
}

export function ensureProjectHomeDir(projectId: string): string {
	const dir = projectHomeDir(projectId);
	mkdirSync(dir, { recursive: true, mode: 0o700 });
	mkdirSync(join(dir, "milestones"), { recursive: true });
	mkdirSync(join(dir, "worktrees"), { recursive: true });
	const settingsPath = join(dir, "settings.yaml");
	if (!existsSync(settingsPath)) {
		writeFileSync(settingsPath, serializeSettings(DEFAULT_SETTINGS), "utf-8");
	}
	return dir;
}

export function createTffSymlink(repoRoot: string, projectId: string): void {
	const piDir = join(repoRoot, ".pi");
	mkdirSync(piDir, { recursive: true });
	const linkPath = join(piDir, ".tff");
	const target = projectHomeDir(projectId);
	if (existsSync(linkPath) || isSymlink(linkPath)) {
		const stat = lstatSync(linkPath);
		if (!stat.isSymbolicLink()) {
			throw new ProjectHomeError(
				".pi/.tff/ exists as a real directory. TFF centralizes state to ~/.tff/{projectId}/.\n" +
					"Before re-initializing:\n" +
					"  1. Back up .pi/.tff/ if you want to preserve its contents\n" +
					"  2. rm -rf .pi/.tff/\n" +
					"  3. Re-run /tff init",
			);
		}
		const actual = readlinkSync(linkPath);
		if (actual !== target) {
			throw new ProjectHomeError(
				`.pi/.tff/ symlink points to ${actual} but expected ${target}. Run: rm .pi/.tff && /tff init`,
			);
		}
		return;
	}
	symlinkSync(target, linkPath, "dir");
}

export function projectIdFilePath(repoRoot: string): string {
	return join(repoRoot, ".tff-project-id");
}

export function readProjectIdFile(repoRoot: string): string | null {
	let raw: string;
	try {
		raw = readFileSync(projectIdFilePath(repoRoot), "utf-8");
	} catch (e) {
		if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
		throw e;
	}
	const trimmed = raw.trim();
	if (!isUuidV4(trimmed)) {
		throw new ProjectHomeError(
			`.tff-project-id does not contain a valid UUID v4: ${trimmed.slice(0, 40)}…`,
		);
	}
	return trimmed;
}

export function writeProjectIdFile(repoRoot: string, projectId: string): void {
	writeFileSync(projectIdFilePath(repoRoot), `${projectId}\n`, "utf-8");
}

/**
 * Returns the tracked `.tff-project-id` UUID or throws an instructive error.
 * Commands that create or mutate project state (e.g. `handleNew`) should call
 * this at the start so test authors who forget `handleInit` get a targeted
 * message instead of a mysterious downstream failure.
 */
export function ensureInitialized(repoRoot: string): string {
	const trackedId = readProjectIdFile(repoRoot);
	if (!trackedId) {
		throw new ProjectHomeError(
			"Project is not initialized: .tff-project-id is missing. " +
				"Call handleInit(repoRoot) first; /tff commands invoke it automatically — " +
				"tests that bypass the normal entry points must do the same.",
		);
	}
	return trackedId;
}

/** Returns true for both dangling and non-dangling symlinks. */
function isSymlink(p: string): boolean {
	try {
		return lstatSync(p).isSymbolicLink();
	} catch {
		return false;
	}
}

function resolveMergeDriverPath(): string {
	// The merge-driver bin always lives at <pkg>/dist/tools/state-snapshot-merge.js.
	// Resolving via "../../dist/tools/..." from import.meta.url works whether
	// project-home is loaded as src (vitest transform) or dist (compiled),
	// because both src/common/ and dist/common/ are two levels below <pkg>/.
	// The `pnpm run build &&` prefix on the test script ensures the .js exists
	// before any test triggers ensureSnapshotMergeDriver. A phantom path here
	// would silently break every git merge.
	const jsUrl = new URL("../../dist/tools/state-snapshot-merge.js", import.meta.url);
	const jsPath = decodeURIComponent(jsUrl.pathname);
	if (existsSync(jsPath)) return jsPath;
	throw new ProjectHomeError(
		`Cannot locate merge-driver bin. Expected at ${jsPath}. ` +
			`Rebuild tff-pi with 'pnpm run build' or reinstall.`,
	);
}

function expectedDriverCommand(): string {
	const path = resolveMergeDriverPath();
	const quoted = path.replace(/'/g, `'\\''`);
	return `node '${quoted}' %O %A %B %P`;
}

export function ensureSnapshotMergeDriver(repoRoot: string): void {
	const expected = expectedDriverCommand();
	let current: string | undefined;
	try {
		current = execFileSync(
			"git",
			["-C", repoRoot, "config", "--local", "--get", "merge.tff-snapshot.driver"],
			{ encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] },
		).trim();
	} catch {
		current = undefined;
	}
	if (current === expected) return;
	execFileSync(
		"git",
		[
			"-C",
			repoRoot,
			"config",
			"--local",
			"merge.tff-snapshot.name",
			"TFF state snapshot 3-way merge",
		],
		{ stdio: "ignore" },
	);
	execFileSync(
		"git",
		["-C", repoRoot, "config", "--local", "merge.tff-snapshot.driver", expected],
		{ stdio: "ignore" },
	);
}
