import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../../../src/common/settings.js";
import type { TffContext } from "../../../src/common/context.js";
import { runSettingsSet } from "../../../src/commands/settings-set.js";

function makeMockPi(): ExtensionAPI {
	return {
		events: {
			emit: vi.fn(),
			on: vi.fn(),
			once: vi.fn(),
			off: vi.fn(),
		},
		sendUserMessage: vi.fn(),
		commands: {
			executeCommand: vi.fn(),
		},
	} as unknown as ExtensionAPI;
}

function makeCtx(root: string): TffContext {
	return {
		projectRoot: root,
		settings: { ...DEFAULT_SETTINGS, compress: { ...DEFAULT_SETTINGS.compress } },
		db: null,
		perSliceLog: null,
		fffBridge: null,
		toolCallLogger: null,
		tuiMonitor: null,
		cmdCtx: null,
		initError: null,
	};
}

describe("runSettingsSet", () => {
	let root: string;
	let pi: ExtensionAPI;

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "tff-settings-"));
		pi = makeMockPi();
	});

	afterEach(() => {
		rmSync(root, { recursive: true });
	});

	it("sets model_profile to a valid value and writes settings.yaml", async () => {
		const ctx = makeCtx(root);
		await runSettingsSet(pi, ctx, null, ["model_profile", "quality"]);

		expect(pi.sendUserMessage).toHaveBeenCalledWith(
			expect.stringContaining("Updated model_profile to quality"),
		);

		const yaml = readFileSync(join(root, ".tff", "settings.yaml"), "utf-8");
		expect(yaml).toContain("model_profile: quality");
		expect(ctx.settings!.model_profile).toBe("quality");
	});

	it("rejects an unknown key with a list of valid keys", async () => {
		const ctx = makeCtx(root);
		await runSettingsSet(pi, ctx, null, ["unknown_key", "value"]);

		expect(pi.sendUserMessage).toHaveBeenCalledWith(expect.stringContaining("Unknown setting key"));
		expect(pi.sendUserMessage).toHaveBeenCalledWith(expect.stringContaining("model_profile"));
	});

	it("rejects an invalid enum value", async () => {
		const ctx = makeCtx(root);
		await runSettingsSet(pi, ctx, null, ["model_profile", "invalid"]);

		expect(pi.sendUserMessage).toHaveBeenCalledWith(
			expect.stringContaining("Invalid value for model_profile"),
		);
	});

	it("sets compress.user_artifacts to true", async () => {
		const ctx = makeCtx(root);
		await runSettingsSet(pi, ctx, null, ["compress.user_artifacts", "true"]);

		expect(pi.sendUserMessage).toHaveBeenCalledWith(
			expect.stringContaining("Updated compress.user_artifacts to true"),
		);
		expect(ctx.settings!.compress.user_artifacts).toBe(true);
	});

	it("shows usage when key or value is missing", async () => {
		const ctx = makeCtx(root);
		await runSettingsSet(pi, ctx, null, ["model_profile"]);

		expect(pi.sendUserMessage).toHaveBeenCalledWith("Usage: /tff settings set <key> <value>");
	});
});
