import { describe, it, expect } from "vitest";
import {
	tierTooLowDominant,
	tierTooHighDominant,
	agentWrongRateHigh,
	runAllRules,
	type CalibrationCell,
	type RuleConfig,
} from "../../src/shared/calibration-rules.js";

const makeCell = (overrides: Partial<CalibrationCell> = {}): CalibrationCell => ({
	key: { kind: "agent", value: "agent-a" },
	total: 10,
	effective_total: 10,
	effective_wrong: 5,
	verdict_breakdown: { ok: 5, wrong: 0, too_low: 3, too_high: 2 },
	sample_decision_ids: [],
	...overrides,
});

const config: RuleConfig = { n_min: 5 };

describe("tierTooLowDominant", () => {
	it("returns empty when effective_total < n_min", () => {
		const cell = makeCell({ effective_total: 3 });
		expect(tierTooLowDominant(cell, config)).toEqual([]);
	});

	it("returns empty when no directional verdicts", () => {
		const cell = makeCell({ verdict_breakdown: { ok: 10, wrong: 0, too_low: 0, too_high: 0 } });
		expect(tierTooLowDominant(cell, config)).toEqual([]);
	});

	it("returns empty when too_low ratio is below threshold", () => {
		const cell = makeCell({ verdict_breakdown: { ok: 5, wrong: 0, too_low: 1, too_high: 2 } });
		expect(tierTooLowDominant(cell, config)).toEqual([]);
	});

	it("returns recommendation when too_low is dominant", () => {
		const cell = makeCell({ verdict_breakdown: { ok: 2, wrong: 0, too_low: 4, too_high: 1 } });
		const recs = tierTooLowDominant(cell, config);
		expect(recs.length).toBe(1);
		expect(recs[0].rule_id).toBe("tier-too-low-dominant");
		expect(recs[0].severity).toBe("suggest");
	});
});

describe("tierTooHighDominant", () => {
	it("returns empty when effective_total < n_min", () => {
		const cell = makeCell({ effective_total: 3 });
		expect(tierTooHighDominant(cell, config)).toEqual([]);
	});

	it("returns empty when too_high ratio is below threshold", () => {
		const cell = makeCell({ verdict_breakdown: { ok: 5, wrong: 0, too_low: 2, too_high: 1 } });
		expect(tierTooHighDominant(cell, config)).toEqual([]);
	});

	it("returns recommendation when too_high is dominant", () => {
		const cell = makeCell({ verdict_breakdown: { ok: 2, wrong: 0, too_low: 1, too_high: 4 } });
		const recs = tierTooHighDominant(cell, config);
		expect(recs.length).toBe(1);
		expect(recs[0].rule_id).toBe("tier-too-high-dominant");
		expect(recs[0].severity).toBe("suggest");
	});
});

describe("agentWrongRateHigh", () => {
	it("returns empty when cell kind is not agent", () => {
		const cell = makeCell({ key: { kind: "tag", value: "security" } });
		expect(agentWrongRateHigh(cell, config)).toEqual([]);
	});

	it("returns empty when effective_total < n_min", () => {
		const cell = makeCell({ effective_total: 3 });
		expect(agentWrongRateHigh(cell, config)).toEqual([]);
	});

	it("returns empty when wrong rate is below threshold", () => {
		const cell = makeCell({ effective_total: 10, effective_wrong: 3 });
		expect(agentWrongRateHigh(cell, config)).toEqual([]);
	});

	it("returns strong recommendation when wrong rate is high", () => {
		const cell = makeCell({ effective_total: 10, effective_wrong: 5 });
		const recs = agentWrongRateHigh(cell, config);
		expect(recs.length).toBe(1);
		expect(recs[0].rule_id).toBe("agent-wrong-rate-high");
		expect(recs[0].severity).toBe("strong");
		expect(recs[0].message).toContain("50% wrong outcomes");
	});
});

describe("runAllRules", () => {
	it("aggregates recommendations from all applicable rules", () => {
		const cell = makeCell({
			verdict_breakdown: { ok: 0, wrong: 0, too_low: 4, too_high: 1 },
			effective_wrong: 10,
		});
		const recs = runAllRules(cell, config);
		const ruleIds = recs.map((r) => r.rule_id);
		expect(ruleIds).toContain("tier-too-low-dominant");
		expect(ruleIds).toContain("agent-wrong-rate-high");
	});
});
