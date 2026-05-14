import { describe, expect, it, vi } from "vitest";
import { Ok, Err } from "@tff/core";
import { worktreeDeleteCmd } from "../../../../src/cli/commands/worktree-delete.cmd.js";

const deleteWorktreeMock = vi.fn();

vi.mock("../../../../src/infrastructure/adapters/git/git-cli.adapter.js", () => ({
	GitCliAdapter: class {
		async deleteWorktree(...args: unknown[]) {
			return deleteWorktreeMock(...args);
		}
	},
}));

describe("worktree:delete", () => {
	it("deletes worktree successfully", async () => {
		deleteWorktreeMock.mockResolvedValue(Ok(undefined));
		const result = JSON.parse(await worktreeDeleteCmd(["--slice-id", "M01-S01"]));
		expect(result.ok).toBe(true);
	});

	it("returns error on delete failure", async () => {
		deleteWorktreeMock.mockResolvedValue(
			Err({ code: "GIT_CONFLICT", message: "worktree not found" }),
		);
		const result = JSON.parse(await worktreeDeleteCmd(["--slice-id", "M01-S01"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("GIT_CONFLICT");
	});

	it("fails for invalid slice-id format", async () => {
		const result = JSON.parse(await worktreeDeleteCmd(["--slice-id", "invalid"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PATTERN_MISMATCH");
	});

	it("fails when missing required flag", async () => {
		const result = JSON.parse(await worktreeDeleteCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
