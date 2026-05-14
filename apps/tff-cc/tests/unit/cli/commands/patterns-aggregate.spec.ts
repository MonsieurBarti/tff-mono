import { describe, expect, it, vi } from "vitest";
import { Ok } from "@tff/core";
import { patternsAggregateCmd } from "../../../../src/cli/commands/patterns-aggregate.cmd.js";

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
				{
					ngram: ["c", "d"],
					count: 1,
					sessions: 1,
					projects: 1,
					firstSeen: "2024-01-01",
					lastSeen: "2024-01-01",
				},
			]);
		}
		async writePatterns() {
			return Ok(undefined);
		}
	},
}));

describe("patterns:aggregate", () => {
	it("aggregates with default min-count", async () => {
		const result = JSON.parse(await patternsAggregateCmd([]));
		expect(result.ok).toBe(true);
		expect(Array.isArray(result.data)).toBe(true);
		expect(result.data.length).toBe(1);
	});

	it("aggregates with custom min-count", async () => {
		const result = JSON.parse(await patternsAggregateCmd(["--min-count", "1"]));
		expect(result.ok).toBe(true);
		expect(Array.isArray(result.data)).toBe(true);
		expect(result.data.length).toBe(2);
	});

	it("returns empty when no patterns match", async () => {
		vi.mocked(
			await import("../../../../src/infrastructure/adapters/jsonl/jsonl-store.adapter.js"),
		).JsonlStoreAdapter = class {
			async readPatterns() {
				return Ok([]);
			}
			async writePatterns() {
				return Ok(undefined);
			}
		};
		const result = JSON.parse(await patternsAggregateCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data).toEqual([]);
	});

	it("fails for invalid min-count type", async () => {
		const result = JSON.parse(await patternsAggregateCmd(["--min-count", "not-a-number"]));
		expect(result.ok).toBe(false);
	});
});
