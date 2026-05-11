import { describe, it, expect } from "vitest";
import {
	signalsToPolicyTier,
	resolveEffectiveTier,
	TIER_ORDER,
	type ComplexityLevel,
	type RiskLevel,
	type ModelTier,
} from "../../src/shared/tier-resolver.js";

describe("TIER_ORDER", () => {
	it("assigns correct numeric order", () => {
		expect(TIER_ORDER.haiku).toBe(0);
		expect(TIER_ORDER.sonnet).toBe(1);
		expect(TIER_ORDER.opus).toBe(2);
	});
});

describe("signalsToPolicyTier", () => {
	const policy: Record<ComplexityLevel | RiskLevel, ModelTier> = {
		low: "haiku",
		medium: "sonnet",
		high: "opus",
	};

	it("returns complexity tier when it dominates", () => {
		const signals = { complexity: "high" as ComplexityLevel, risk: { level: "low" as RiskLevel } };
		expect(signalsToPolicyTier(signals, policy)).toBe("opus");
	});

	it("returns risk tier when it dominates", () => {
		const signals = { complexity: "low" as ComplexityLevel, risk: { level: "high" as RiskLevel } };
		expect(signalsToPolicyTier(signals, policy)).toBe("opus");
	});

	it("returns complexity tier when equal", () => {
		const signals = {
			complexity: "medium" as ComplexityLevel,
			risk: { level: "medium" as RiskLevel },
		};
		expect(signalsToPolicyTier(signals, policy)).toBe("sonnet");
	});
});

describe("resolveEffectiveTier", () => {
	it("returns policy tier when it meets minimum", () => {
		const result = resolveEffectiveTier("sonnet", "haiku");
		expect(result.tier).toBe("sonnet");
		expect(result.min_tier_applied).toBe(false);
	});

	it("returns policy tier when equal to minimum", () => {
		const result = resolveEffectiveTier("sonnet", "sonnet");
		expect(result.tier).toBe("sonnet");
		expect(result.min_tier_applied).toBe(false);
	});

	it("bumps to min tier when policy is below minimum", () => {
		const result = resolveEffectiveTier("haiku", "opus");
		expect(result.tier).toBe("opus");
		expect(result.min_tier_applied).toBe(true);
	});

	it("bumps to min tier when policy is one step below", () => {
		const result = resolveEffectiveTier("haiku", "sonnet");
		expect(result.tier).toBe("sonnet");
		expect(result.min_tier_applied).toBe(true);
	});
});
