import { describe, expect, it, vi } from "vitest";
import { Ok } from "@tff/core";
import { worktreeListCmd } from "../../../../src/cli/commands/worktree-list.cmd.js";

vi.mock("../../../../src/infrastructure/adapters/git/git-cli.adapter.js", () => ({
	GitCliAdapter: class {
		async listWorktrees() {
			return Ok(["/path/to/wt1", "/path/to/wt2"]);
		}
	},
}));

describe("worktree:list", () => {
	it("lists worktrees", async () => {
		const result = JSON.parse(await worktreeListCmd([]));
		expect(result.ok).toBe(true);
		expect(Array.isArray(result.data)).toBe(true);
		expect(result.data).toEqual(["/path/to/wt1", "/path/to/wt2"]);
	});

	it("returns help JSON for --help flag", async () => {
		const result = JSON.parse(await worktreeListCmd(["--help"]));
		expect(result.ok).toBe(true);
		expect(result.data.name).toBe("worktree:list");
	});
});
