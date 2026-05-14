import { describe, expect, it, vi } from "vitest";
import { Ok } from "@tff/core";
import { patternsExtractCmd } from "../../../../src/cli/commands/patterns-extract.cmd.js";

vi.mock("../../../../src/infrastructure/adapters/jsonl/jsonl-store.adapter.js", () => ({
	JsonlStoreAdapter: class {
		async readObservations() {
			return Ok([
				{ ts: "2024-01-01", session: "s1", tool: "Read", args: null, project: "p1" },
				{ ts: "2024-01-01", session: "s1", tool: "Write", args: null, project: "p1" },
			]);
		}
		async writePatterns() {
			return Ok(undefined);
		}
	},
}));

describe("patterns:extract", () => {
	it("extracts patterns from observations", async () => {
		const result = JSON.parse(await patternsExtractCmd([]));
		expect(result.ok).toBe(true);
		expect(Array.isArray(result.data)).toBe(true);
	});

	it("returns help JSON for --help flag", async () => {
		const result = JSON.parse(await patternsExtractCmd(["--help"]));
		expect(result.ok).toBe(true);
		expect(result.data.name).toBe("patterns:extract");
	});
});
