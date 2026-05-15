import { mkdtempSync, rmSync, chmodSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
	resolveTffPath,
	writeArtifact,
	deleteArtifact,
	readArtifact,
	artifactExists,
	initTffDirectory,
	initMilestoneDir,
	initSliceDir,
} from "../../src/shared/artifact-io.js";
import { milestoneLabel, sliceLabel } from "../../src/shared/branch-naming.js";

describe("artifact-io", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "artifact-io-test-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	describe("resolveTffPath", () => {
		it("produces correct absolute paths", () => {
			const result = resolveTffPath(tempDir, "milestones", "M01", "SPEC.md");
			expect(result).toBe(join(tempDir, ".tff", "milestones", "M01", "SPEC.md"));
		});
	});

	describe("safeTffPath — path traversal rejection", () => {
		it("rejects ../outside.txt", () => {
			expect(() => writeArtifact(tempDir, "../outside.txt", "x")).toThrow(
				"Path traversal detected",
			);
		});

		it("rejects ../../etc/passwd", () => {
			expect(() => readArtifact(tempDir, "../../etc/passwd")).toThrow("Path traversal detected");
		});

		it("rejects foo/../../../outside", () => {
			expect(() => artifactExists(tempDir, "foo/../../../outside")).toThrow(
				"Path traversal detected",
			);
		});
	});

	describe("safeTffPath — invalid path rejection", () => {
		it('rejects empty string ""', () => {
			expect(() => writeArtifact(tempDir, "", "x")).toThrow("Invalid artifact path");
		});

		it('rejects "."', () => {
			expect(() => readArtifact(tempDir, ".")).toThrow("Invalid artifact path");
		});

		it('rejects "./"', () => {
			expect(() => deleteArtifact(tempDir, "./")).toThrow("Invalid artifact path");
		});
	});

	describe("safeTffPath — valid nested paths", () => {
		it("works with milestones/M01/slices/M01-S01/SPEC.md", () => {
			const path = "milestones/M01/slices/M01-S01/SPEC.md";
			writeArtifact(tempDir, path, "spec content");
			expect(readArtifact(tempDir, path)).toBe("spec content");
		});
	});

	describe("writeArtifact and readArtifact", () => {
		it("round-trips content", () => {
			writeArtifact(tempDir, "test.txt", "hello world");
			expect(readArtifact(tempDir, "test.txt")).toBe("hello world");
		});

		it("overwrites an existing file", () => {
			writeArtifact(tempDir, "test.txt", "first");
			writeArtifact(tempDir, "test.txt", "second");
			expect(readArtifact(tempDir, "test.txt")).toBe("second");
		});
	});

	describe("deleteArtifact", () => {
		it("removes an existing file", () => {
			writeArtifact(tempDir, "delete-me.txt", "bye");
			expect(artifactExists(tempDir, "delete-me.txt")).toBe(true);
			deleteArtifact(tempDir, "delete-me.txt");
			expect(artifactExists(tempDir, "delete-me.txt")).toBe(false);
		});

		it("is a no-op on a missing file", () => {
			expect(() => deleteArtifact(tempDir, "missing.txt")).not.toThrow();
			expect(artifactExists(tempDir, "missing.txt")).toBe(false);
		});
	});

	describe("artifactExists", () => {
		it("returns true for an existing file", () => {
			writeArtifact(tempDir, "exists.txt", "yes");
			expect(artifactExists(tempDir, "exists.txt")).toBe(true);
		});

		it("returns false for a missing file", () => {
			expect(artifactExists(tempDir, "no-exists.txt")).toBe(false);
		});
	});

	describe("readArtifact", () => {
		it("returns null for a missing file (ENOENT)", () => {
			expect(readArtifact(tempDir, "missing.txt")).toBeNull();
		});

		it("returns null when a file is used as a directory (ENOTDIR)", () => {
			writeArtifact(tempDir, "not-a-dir", "content");
			expect(readArtifact(tempDir, "not-a-dir/child.txt")).toBeNull();
		});

		it("throws on permission errors (EACCES)", () => {
			const filePath = join(tempDir, ".tff", "locked.txt");
			writeArtifact(tempDir, "locked.txt", "secret");
			chmodSync(filePath, 0o000);
			try {
				expect(() => readArtifact(tempDir, "locked.txt")).toThrow();
			} finally {
				chmodSync(filePath, 0o644);
			}
		});
	});

	describe("initTffDirectory", () => {
		it("creates .tff, .tff/milestones, and .tff/worktrees", () => {
			initTffDirectory(tempDir);
			expect(existsSync(join(tempDir, ".tff"))).toBe(true);
			expect(existsSync(join(tempDir, ".tff", "milestones"))).toBe(true);
			expect(existsSync(join(tempDir, ".tff", "worktrees"))).toBe(true);
		});
	});

	describe("initMilestoneDir", () => {
		it("creates the correct milestone directory", () => {
			initMilestoneDir(tempDir, 1);
			const expected = join(tempDir, ".tff", "milestones", milestoneLabel(1));
			expect(existsSync(expected)).toBe(true);
		});
	});

	describe("initSliceDir", () => {
		it("creates the correct nested slice directory", () => {
			initSliceDir(tempDir, 2, 3);
			const expected = join(
				tempDir,
				".tff",
				"milestones",
				milestoneLabel(2),
				"slices",
				sliceLabel(2, 3),
			);
			expect(existsSync(expected)).toBe(true);
		});
	});
});
