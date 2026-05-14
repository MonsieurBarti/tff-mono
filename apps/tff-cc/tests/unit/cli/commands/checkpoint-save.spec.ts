import { describe, expect, it, vi } from "vitest";
import { Ok } from "@tff/core";
import { checkpointSaveCmd } from "../../../../src/cli/commands/checkpoint-save.cmd.js";

vi.mock("../../../../src/infrastructure/adapters/filesystem/markdown-artifact.adapter.js", () => ({
	MarkdownArtifactAdapter: class {
		async write() {
			return Ok(undefined);
		}
	},
}));

vi.mock("../../../../src/application/checkpoint/save-checkpoint.js", () => ({
	saveCheckpoint: async () => Ok(undefined),
}));

describe("checkpoint:save", () => {
	it("saves checkpoint with valid args", async () => {
		const result = JSON.parse(
			await checkpointSaveCmd([
				"--slice-id",
				"M01-S01",
				"--base-commit",
				"abc123",
				"--current-wave",
				"0",
				"--completed-waves",
				"[]",
				"--completed-tasks",
				"[]",
				"--executor-log",
				"[]",
			]),
		);
		expect(result.ok).toBe(true);
	});

	it("fails for invalid slice-id format", async () => {
		const result = JSON.parse(
			await checkpointSaveCmd([
				"--slice-id",
				"invalid",
				"--base-commit",
				"abc123",
				"--current-wave",
				"0",
				"--completed-waves",
				"[]",
				"--completed-tasks",
				"[]",
				"--executor-log",
				"[]",
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PATTERN_MISMATCH");
	});

	it("fails when missing required flags", async () => {
		const result = JSON.parse(await checkpointSaveCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
