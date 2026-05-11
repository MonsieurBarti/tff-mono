import { describe, it, expect, vi } from "vitest";
import { detectDefaultBranch, type RunGit } from "../../src/shared/default-branch.js";

describe("detectDefaultBranch", () => {
	it("returns main as final fallback", async () => {
		const runGit = vi.fn().mockRejectedValue(new Error("git not found")) as unknown as RunGit;
		const result = await detectDefaultBranch(runGit, { cwd: "/tmp" });
		expect(result).toBe("main");
	});

	it("strips origin/ from symbolic-ref output", async () => {
		const runGit = vi.fn(async (_cmd, args) => {
			if (args.includes("symbolic-ref")) return "origin/main\n";
			return "";
		}) as unknown as RunGit;
		const result = await detectDefaultBranch(runGit, { cwd: "/tmp" });
		expect(result).toBe("main");
	});

	it("returns raw output when no origin/ prefix", async () => {
		const runGit = vi.fn(async (_cmd, args) => {
			if (args.includes("symbolic-ref")) return "master\n";
			return "";
		}) as unknown as RunGit;
		const result = await detectDefaultBranch(runGit, { cwd: "/tmp" });
		expect(result).toBe("master");
	});

	it("falls back to init.defaultBranch when symbolic-ref fails", async () => {
		const runGit = vi.fn(async (_cmd, args) => {
			if (args.includes("symbolic-ref")) throw new Error("no ref");
			if (args.includes("init.defaultBranch")) return "trunk\n";
			return "";
		}) as unknown as RunGit;
		const result = await detectDefaultBranch(runGit, { cwd: "/tmp" });
		expect(result).toBe("trunk");
	});

	it("falls back to main when init.defaultBranch is empty", async () => {
		const runGit = vi.fn(async (_cmd, args) => {
			if (args.includes("symbolic-ref")) throw new Error("no ref");
			if (args.includes("init.defaultBranch")) return "  \n";
			return "";
		}) as unknown as RunGit;
		const result = await detectDefaultBranch(runGit, { cwd: "/tmp" });
		expect(result).toBe("main");
	});

	it("ignores empty origin/ result and falls through", async () => {
		const runGit = vi.fn(async (_cmd, args) => {
			if (args.includes("symbolic-ref")) return "origin/\n";
			if (args.includes("init.defaultBranch")) return "develop\n";
			return "";
		}) as unknown as RunGit;
		const result = await detectDefaultBranch(runGit, { cwd: "/tmp" });
		expect(result).toBe("develop");
	});
});
