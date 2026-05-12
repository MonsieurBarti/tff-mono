import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isOk, isErr } from "@tff/core";
import { ClaudeCodeGitAdapter } from "../../../../../src/infrastructure/adapters/git/claude-code-git.adapter.js";

let repoRoot: string;
let git: ClaudeCodeGitAdapter;

beforeEach(() => {
	repoRoot = mkdtempSync(join(tmpdir(), "tff-git-"));
	execFileSync("git", ["init"], { cwd: repoRoot });
	execFileSync("git", ["config", "user.email", "test@test.com"], { cwd: repoRoot });
	execFileSync("git", ["config", "user.name", "Test"], { cwd: repoRoot });
	writeFileSync(join(repoRoot, "a.txt"), "hello", "utf8");
	execFileSync("git", ["add", "."], { cwd: repoRoot });
	execFileSync("git", ["commit", "-m", "init"], { cwd: repoRoot });
	git = new ClaudeCodeGitAdapter(repoRoot);
});

afterEach(() => {
	rmSync(repoRoot, { recursive: true, force: true });
});

describe("ClaudeCodeGitAdapter — happy path", () => {
	it("creates a branch", async () => {
		const res = await git.createBranch("feature-x");
		expect(isOk(res)).toBe(true);
	});

	it("detects current branch", async () => {
		const res = await git.getCurrentBranch();
		expect(isOk(res)).toBe(true);
		if (isOk(res)) expect(res.data).toBe("main");
	});

	it("detects that a branch exists", async () => {
		execFileSync("git", ["branch", "exists-branch"], { cwd: repoRoot });
		const res = await git.branchExists("exists-branch");
		expect(isOk(res)).toBe(true);
		if (isOk(res)) expect(res.data).toBe(true);
	});

	it("detects default branch as main", async () => {
		const res = await git.detectDefaultBranch();
		expect(isOk(res)).toBe(true);
		if (isOk(res)) expect(res.data).toBe("main");
	});

	it("commits and returns sha", async () => {
		writeFileSync(join(repoRoot, "b.txt"), "world", "utf8");
		const res = await git.commit("feat: add b", ["b.txt"]);
		expect(isOk(res)).toBe(true);
		if (isOk(res)) {
			expect(res.data.message).toBe("feat: add b");
			expect(typeof res.data.sha).toBe("string");
			expect(res.data.sha.length).toBeGreaterThanOrEqual(4);
		}
	});

	it("lists tree entries", async () => {
		const res = await git.lsTree("main");
		expect(isOk(res)).toBe(true);
		if (isOk(res)) expect(res.data.length).toBeGreaterThanOrEqual(1);
	});

	it("extracts file content", async () => {
		const res = await git.extractFile("main", "a.txt");
		expect(isOk(res)).toBe(true);
		if (isOk(res)) expect(res.data).toBe("hello");
	});
});

describe("ClaudeCodeGitAdapter — error path", () => {
	it("returns error for missing branch on extractFile", async () => {
		const res = await git.extractFile("nonexistent-branch-123", "a.txt");
		expect(isErr(res)).toBe(true);
		if (isErr(res)) {
			expect(res.error.context.port).toBe("GitOperations");
			expect(res.error.context.operation).toBe("extractFile");
		}
	});

	it("returns false for non-existing branch", async () => {
		const res = await git.branchExists("no-such-branch");
		expect(isOk(res)).toBe(true);
		if (isOk(res)) expect(res.data).toBe(false);
	});
});
