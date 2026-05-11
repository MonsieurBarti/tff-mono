import { describe, it, expect } from "vitest";
import {
	isValidDimensionVerdict,
	type DimensionForPredicate,
	type VerdictForPredicate,
} from "../../src/shared/dimension-verdict.js";

describe("isValidDimensionVerdict", () => {
	it("allows ok and wrong for agent dimension", () => {
		expect(isValidDimensionVerdict("agent", "ok")).toBe(true);
		expect(isValidDimensionVerdict("agent", "wrong")).toBe(true);
		expect(isValidDimensionVerdict("agent", "too-low")).toBe(false);
		expect(isValidDimensionVerdict("agent", "too-high")).toBe(false);
	});

	it("allows only wrong for unknown dimension", () => {
		expect(isValidDimensionVerdict("unknown", "wrong")).toBe(true);
		expect(isValidDimensionVerdict("unknown", "ok")).toBe(false);
		expect(isValidDimensionVerdict("unknown", "too-low")).toBe(false);
		expect(isValidDimensionVerdict("unknown", "too-high")).toBe(false);
	});

	it("allows all verdicts for tier dimension", () => {
		expect(isValidDimensionVerdict("tier", "ok")).toBe(true);
		expect(isValidDimensionVerdict("tier", "wrong")).toBe(true);
		expect(isValidDimensionVerdict("tier", "too-low")).toBe(true);
		expect(isValidDimensionVerdict("tier", "too-high")).toBe(true);
	});

	it("covers all dimension x verdict combinations exhaustively", () => {
		const dimensions: DimensionForPredicate[] = ["agent", "tier", "unknown"];
		const verdicts: VerdictForPredicate[] = ["ok", "wrong", "too-low", "too-high"];
		const expected: Record<string, boolean> = {
			"agent:ok": true,
			"agent:wrong": true,
			"agent:too-low": false,
			"agent:too-high": false,
			"tier:ok": true,
			"tier:wrong": true,
			"tier:too-low": true,
			"tier:too-high": true,
			"unknown:ok": false,
			"unknown:wrong": true,
			"unknown:too-low": false,
			"unknown:too-high": false,
		};

		for (const d of dimensions) {
			for (const v of verdicts) {
				expect(isValidDimensionVerdict(d, v)).toBe(expected[`${d}:${v}`]);
			}
		}
	});
});
