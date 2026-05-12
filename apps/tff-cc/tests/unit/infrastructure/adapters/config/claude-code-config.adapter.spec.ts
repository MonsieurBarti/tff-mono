import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isOk, isErr } from "@tff/core";
import { ClaudeCodeConfigAdapter } from "../../../../../src/infrastructure/adapters/config/claude-code-config.adapter.js";

let repoRoot: string;
let adapter: ClaudeCodeConfigAdapter;

beforeEach(() => {
	repoRoot = mkdtempSync(join(tmpdir(), "tff-cfg-"));
	adapter = new ClaudeCodeConfigAdapter(repoRoot);
});

afterEach(() => {
	rmSync(repoRoot, { recursive: true, force: true });
});

describe("ClaudeCodeConfigAdapter — happy path", () => {
	it("reads full config when no keyPath given", async () => {
		mkdirSync(join(repoRoot, ".tff"), { recursive: true });
		writeFileSync(
			join(repoRoot, ".tff", "settings.yaml"),
			`routing:\n  tier_policy:\n    low: haiku\n`,
			"utf8",
		);
		const res = await adapter.readConfig();
		expect(isOk(res)).toBe(true);
		if (isOk(res)) {
			expect(typeof res.data).toBe("object");
			expect((res.data as Record<string, unknown>).routing).toBeDefined();
		}
	});

	it("reads nested value by keyPath", async () => {
		mkdirSync(join(repoRoot, ".tff"), { recursive: true });
		writeFileSync(
			join(repoRoot, ".tff", "settings.yaml"),
			`routing:\n  tier_policy:\n    low: haiku\n`,
			"utf8",
		);
		const res = await adapter.readConfig("routing.tier_policy.low");
		expect(isOk(res)).toBe(true);
		if (isOk(res)) expect(res.data).toBe("haiku");
	});
});

describe("ClaudeCodeConfigAdapter — error path", () => {
	it("returns error when settings.yaml is missing", async () => {
		const res = await adapter.readConfig();
		expect(isErr(res)).toBe(true);
		if (isErr(res)) {
			expect(res.error.context.port).toBe("ConfigReader");
			expect(res.error.context.operation).toBe("readConfig");
		}
	});

	it("returns error when keyPath does not exist", async () => {
		mkdirSync(join(repoRoot, ".tff"), { recursive: true });
		writeFileSync(join(repoRoot, ".tff", "settings.yaml"), `foo: bar\n`, "utf8");
		const res = await adapter.readConfig("missing.key");
		expect(isErr(res)).toBe(true);
		if (isErr(res)) {
			expect(res.error.context.port).toBe("ConfigReader");
			expect(res.error.context.operation).toBe("readConfig");
			expect(res.error.message).toContain("keyPath not found");
		}
	});
});
