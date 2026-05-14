import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { TFF_DIR } from "./paths.js";
import { milestoneLabel, sliceLabel } from "./branch-naming.js";

export function resolveTffPath(root: string, ...segments: string[]): string {
	return join(root, TFF_DIR, ...segments);
}

function safeTffPath(root: string, relativePath: string): string {
	const tffRoot = resolve(root, TFF_DIR);
	const fullPath = resolve(tffRoot, relativePath);
	if (fullPath !== tffRoot && !fullPath.startsWith(`${tffRoot}/`)) {
		throw new Error(`Path traversal detected: ${relativePath}`);
	}
	return fullPath;
}

export function writeArtifact(root: string, relativePath: string, content: string): void {
	const fullPath = safeTffPath(root, relativePath);
	mkdirSync(dirname(fullPath), { recursive: true });
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
	} catch {
		return null;
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
