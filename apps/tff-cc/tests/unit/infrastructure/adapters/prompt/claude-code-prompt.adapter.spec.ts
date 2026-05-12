import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isOk, isErr } from "@tff/core";
import { ClaudeCodePromptAdapter } from "../../../../../src/infrastructure/adapters/prompt/claude-code-prompt.adapter.js";

let repoRoot: string;
let adapter: ClaudeCodePromptAdapter;

beforeEach(() => {
	repoRoot = mkdtempSync(join(tmpdir(), "tff-prompt-"));
	adapter = new ClaudeCodePromptAdapter(repoRoot);
});

afterEach(() => {
	rmSync(repoRoot, { recursive: true, force: true });
});

describe("ClaudeCodePromptAdapter — happy path", () => {
	it("loads prompt from exact path", async () => {
		const dir = join(repoRoot, "packages", "core", "src", "content", "agents");
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "tff-code-reviewer.md"), "# Reviewer\n", "utf8");
		const res = await adapter.load("agent", "tff-code-reviewer");
		expect(isOk(res)).toBe(true);
		if (isOk(res)) expect(res.data).toBe("# Reviewer\n");
	});

	it("loads prompt from subdirectory", async () => {
		const dir = join(repoRoot, "packages", "core", "src", "content", "skills");
		mkdirSync(join(dir, "review"), { recursive: true });
		writeFileSync(join(dir, "review", "code-review.md"), "# Code Review\n", "utf8");
		const res = await adapter.load("skill", "code-review");
		expect(isOk(res)).toBe(true);
		if (isOk(res)) expect(res.data).toBe("# Code Review\n");
	});
});

describe("ClaudeCodePromptAdapter — error path", () => {
	it("returns error when prompt is missing", async () => {
		const dir = join(repoRoot, "packages", "core", "src", "content", "agents");
		mkdirSync(dir, { recursive: true });
		const res = await adapter.load("agent", "ghost-prompt");
		expect(isErr(res)).toBe(true);
		if (isErr(res)) {
			expect(res.error.context.port).toBe("PromptLoader");
			expect(res.error.context.operation).toBe("load");
			expect(res.error.message).toContain("Prompt not found");
		}
	});

	it("returns error when content directory is missing", async () => {
		const res = await adapter.load("workflow", "missing");
		expect(isErr(res)).toBe(true);
		if (isErr(res)) {
			expect(res.error.context.port).toBe("PromptLoader");
			expect(res.error.context.operation).toBe("load");
			expect(res.error.message).toContain("Failed to load prompt");
		}
	});
});
