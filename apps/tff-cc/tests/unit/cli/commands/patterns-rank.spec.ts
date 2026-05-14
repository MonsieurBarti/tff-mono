import { describe, expect, it, vi } from "vitest";
import { Ok } from "@tff/core";
import { patternsRankCmd } from "../../../../src/cli/commands/patterns-rank.cmd.js";

vi.mock("../../../../src/infrastructure/adapters/jsonl/jsonl-store.adapter.js", () => ({
	JsonlStoreAdapter: class {
		async readPatterns() {
			return Ok([
				{
					ngram: ["a", "b"],
					count: 5,
					sessions: 2,
					projects: 1,
					firstSeen: "2024-01-01",
					lastSeen: "2024-01-02",
				},
			]);
		}
		async readObservations() {
			return Ok([{ ts: "2024-01-01", session: "s1", tool: "Read", args: null, project: "p1" }]);
		}
		async writeCandidates() {
			return Ok(undefined);
		}
	},
}));

describe("patterns:rank", () => {
	it("ranks with default threshold", async () => {
		const result = JSON.parse(await patternsRankCmd([]));
		expect(result.ok).toBe(true);
		expect(Array.isArray(result.data)).toBe(true);
	});

	it("ranks with custom threshold", async () => {
		const result = JSON.parse(await patternsRankCmd(["--threshold", "0.1"]));
		expect(result.ok).toBe(true);
		expect(Array.isArray(result.data)).toBe(true);
	});

	it("returns empty when no patterns exist", async () => {
		vi.mocked(
			await import("../../../../src/infrastructure/adapters/jsonl/jsonl-store.adapter.js"),
		).JsonlStoreAdapter = class {
			async readPatterns() {
				return Ok([]);
			}
			async readObservations() {
				return Ok([]);
			}
			async writeCandidates() {
				return Ok(undefined);
			}
		};
		const result = JSON.parse(await patternsRankCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data).toEqual([]);
	});
});
