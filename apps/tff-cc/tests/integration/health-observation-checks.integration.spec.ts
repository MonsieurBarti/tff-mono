import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { observeHealthCmd } from "../../src/cli/commands/observe-health.cmd.js";
import { tffWarn } from "../../src/infrastructure/adapters/logging/warn.js";

vi.mock("../../src/infrastructure/adapters/logging/warn.js", () => ({
	tffWarn: vi.fn(),
}));

describe("observe:health integration", () => {
	let tmp: string;
	const originalCwd = process.cwd();

	beforeEach(() => {
		tmp = fs.mkdtempSync(path.join(os.tmpdir(), "observe-health-int-"));
		process.chdir(tmp);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it("reports MISSING last-observation when sessions.jsonl absent", async () => {
		const out = await observeHealthCmd([]);
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(true);
		expect(parsed.data.lastObservation.present).toBe(false);
	});

	it("warns first-observation when enabled + sentinel + no sessions", async () => {
		fs.mkdirSync(path.join(tmp, ".tff/observations"), { recursive: true });
		fs.writeFileSync(path.join(tmp, ".tff/settings.yaml"), "enabled: true\n");
		fs.writeFileSync(path.join(tmp, ".tff/observations/.mutating-cli-ran"), "");
		const out = await observeHealthCmd([]);
		const parsed = JSON.parse(out);
		expect(parsed.data.firstObservationSentinel.shouldWarn).toBe(true);
	});

	it("reports dead-letter entryCount when non-empty", async () => {
		fs.mkdirSync(path.join(tmp, ".tff/observations"), { recursive: true });
		fs.writeFileSync(path.join(tmp, ".tff/observations/dead-letter.jsonl"), "line1\nline2\n");
		const out = await observeHealthCmd([]);
		const parsed = JSON.parse(out);
		expect(parsed.data.deadLetter.entryCount).toBe(2);
		expect(parsed.data.deadLetter.bytes).toBeGreaterThan(0);
	});

	it("logs warning for malformed journal entries", async () => {
		fs.mkdirSync(path.join(tmp, ".tff/observations"), { recursive: true });
		fs.writeFileSync(path.join(tmp, ".tff/observations/sessions.jsonl"), "not-json\n");
		const out = await observeHealthCmd([]);
		const parsed = JSON.parse(out);
		expect(parsed.ok).toBe(true);
		expect(parsed.data.lastObservation.ok).toBe(false);
		expect(tffWarn).toHaveBeenCalled();
	});
});
