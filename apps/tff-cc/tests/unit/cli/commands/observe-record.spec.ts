import { describe, expect, it, vi } from "vitest";
import { Ok } from "@tff/core";
import { observeRecordCmd } from "../../../../src/cli/commands/observe-record.cmd.js";

vi.mock("../../../../src/infrastructure/adapters/jsonl/jsonl-store.adapter.js", () => ({
	JsonlStoreAdapter: class {
		async appendObservation() {
			return Ok(undefined);
		}
	},
}));

describe("observe:record", () => {
	it("records a valid observation", async () => {
		const result = JSON.parse(
			await observeRecordCmd([
				"--ts",
				"2024-01-01T00:00:00Z",
				"--session",
				"sess-1",
				"--tool",
				"Read",
				"--args",
				'{"path":"file.ts"}',
				"--project",
				"proj-1",
			]),
		);
		expect(result.ok).toBe(true);
	});

	it("returns error for invalid args (catch block)", async () => {
		const result = JSON.parse(
			await observeRecordCmd([
				"--ts",
				"2024-01-01T00:00:00Z",
				"--session",
				"sess-1",
				"--tool",
				"Read",
				"--args",
				"not-json",
				"--project",
				"proj-1",
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("INVALID_JSON");
	});

	it("fails when missing required flags", async () => {
		const result = JSON.parse(await observeRecordCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
