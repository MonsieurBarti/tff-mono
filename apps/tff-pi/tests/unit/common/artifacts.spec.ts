import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initTffDirectory, resolveTffPath } from "@tff/core";

describe("resolveTffPath", () => {
	let root: string;

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "tff-artifacts-test-"));
		initTffDirectory(root);
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it("resolves settings.yaml under .tff/", () => {
		const path = resolveTffPath(root, "settings.yaml");
		expect(path).toBe(join(root, ".tff", "settings.yaml"));
	});

	it("resolves nested segments under .tff/", () => {
		const path = resolveTffPath(root, "milestones", "m01", "slices", "s01", "SPEC.md");
		expect(path).toBe(join(root, ".tff", "milestones", "m01", "slices", "s01", "SPEC.md"));
	});
});
