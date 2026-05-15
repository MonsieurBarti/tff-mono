import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, resolve, sep } from "node:path";
import { TFF_DIR } from "./paths.js";
import { milestoneLabel, sliceLabel } from "./branch-naming.js";

export function resolveTffPath(root: string, ...segments: string[]): string {
	return join(root, TFF_DIR, ...segments);
}

function safeTffPath(root: string, relativePath: string): string {
	if (!relativePath || relativePath === "." || relativePath === "./") {
		throw new Error(`Invalid artifact path: ${relativePath}`);
	}
	const tffRoot = resolve(root, TFF_DIR);
	const fullPath = resolve(tffRoot, relativePath);
	// Normalize both paths for cross-platform comparison (Windows backslashes, etc.)
	const normTffRoot = normalize(tffRoot + sep);
	const normFullPath = normalize(fullPath);
	if (!normFullPath.startsWith(normTffRoot) && normFullPath !== normalize(tffRoot)) {
		throw new Error(`Path traversal detected: ${relativePath}`);
	}
	return fullPath;
}

const ensuredDirs = new Set<string>();

export function writeArtifact(root: string, relativePath: string, content: string): void {
	const fullPath = safeTffPath(root, relativePath);
	const parent = dirname(fullPath);
	if (!ensuredDirs.has(parent)) {
		mkdirSync(parent, { recursive: true });
		ensuredDirs.add(parent);
	}
	writeFileSync(fullPath, content, "utf-8");
}

export function deleteArtifact(root: string, relativePath: string): void {
	const fullPath = safeTffPath(root, relativePath);
	if (existsSync(fullPath)) {
		rmSync(fullPath, { force: true });
	}
}

export function readArtifact(root: string, relativePath: string): string | null {
	const fullPath = safeTffPath(root, relativePath);
	try {
		return readFileSync(fullPath, "utf-8");
	} catch (error) {
		if (
			error instanceof Error &&
			(error.message.includes("ENOENT") || error.message.includes("ENOTDIR"))
		) {
			return null;
		}
		throw error;
	}
}

export function artifactExists(root: string, relativePath: string): boolean {
	return existsSync(safeTffPath(root, relativePath));
}

export function initTffDirectory(root: string): void {
	const tffRoot = resolveTffPath(root);
	mkdirSync(tffRoot, { recursive: true });
	mkdirSync(resolveTffPath(root, "milestones"), { recursive: true });
	mkdirSync(resolveTffPath(root, "worktrees"), { recursive: true });
}

export function initMilestoneDir(root: string, milestoneNumber: number): void {
	mkdirSync(resolveTffPath(root, "milestones", milestoneLabel(milestoneNumber)), {
		recursive: true,
	});
}

export function initSliceDir(root: string, milestoneNumber: number, sliceNumber: number): void {
	mkdirSync(
		resolveTffPath(
			root,
			"milestones",
			milestoneLabel(milestoneNumber),
			"slices",
			sliceLabel(milestoneNumber, sliceNumber),
		),
		{ recursive: true },
	);
}
