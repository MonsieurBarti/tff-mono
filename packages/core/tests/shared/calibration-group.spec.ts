import { describe, it, expect } from "vitest";
import { groupOutcomes, type GroupOutcomesInput } from "../../src/shared/calibration-group.js";

const makeDecision = (id: string, agent: string, tags: string[] = []) => ({
	decision_id: id,
	agent,
	signals: { risk: { tags } },
});

const makeOutcome = (
	decision_id: string,
	verdict: "ok" | "wrong" | "too-low" | "too-high",
	source = "manual",
) => ({
	decision_id,
	verdict,
	source,
});

describe("groupOutcomes", () => {
	it("returns empty maps for empty input", () => {
		const result = groupOutcomes({ decisions: [], outcomes: [], weights: {} });
		expect(result.byAgent.size).toBe(0);
		expect(result.byTag.size).toBe(0);
	});

	it("groups by agent", () => {
		const input: GroupOutcomesInput = {
			decisions: [makeDecision("d1", "agent-a")],
			outcomes: [makeOutcome("d1", "ok")],
			weights: { manual: 1 },
		};
		const result = groupOutcomes(input);
		expect(result.byAgent.get("agent-a")?.total).toBe(1);
		expect(result.byAgent.get("agent-a")?.effective_total).toBe(1);
		expect(result.byAgent.get("agent-a")?.verdict_breakdown.ok).toBe(1);
	});

	it("groups by tag", () => {
		const input: GroupOutcomesInput = {
			decisions: [makeDecision("d1", "agent-a", ["security", "performance"])],
			outcomes: [makeOutcome("d1", "wrong")],
			weights: { manual: 1 },
		};
		const result = groupOutcomes(input);
		expect(result.byTag.get("security")?.total).toBe(1);
		expect(result.byTag.get("performance")?.total).toBe(1);
		expect(result.byTag.get("security")?.effective_wrong).toBe(1);
	});

	it("ignores outcomes with missing decisions", () => {
		const input: GroupOutcomesInput = {
			decisions: [makeDecision("d1", "agent-a")],
			outcomes: [makeOutcome("d2", "ok")],
			weights: { manual: 1 },
		};
		const result = groupOutcomes(input);
		expect(result.byAgent.size).toBe(0);
	});

	it("applies weights per source", () => {
		const input: GroupOutcomesInput = {
			decisions: [makeDecision("d1", "agent-a")],
			outcomes: [makeOutcome("d1", "wrong", "manual"), makeOutcome("d1", "wrong", "model-judge")],
			weights: { manual: 1, "model-judge": 2 },
		};
		const result = groupOutcomes(input);
		const cell = result.byAgent.get("agent-a")!;
		expect(cell.total).toBe(2);
		expect(cell.effective_total).toBe(3);
		expect(cell.effective_wrong).toBe(3);
	});

	it("treats unknown source as weight 0", () => {
		const input: GroupOutcomesInput = {
			decisions: [makeDecision("d1", "agent-a")],
			outcomes: [makeOutcome("d1", "wrong", "unknown-source")],
			weights: { manual: 1 },
		};
		const result = groupOutcomes(input);
		const cell = result.byAgent.get("agent-a")!;
		expect(cell.total).toBe(1);
		expect(cell.effective_total).toBe(0);
		expect(cell.effective_wrong).toBe(0);
	});

	it("accumulates verdict breakdown correctly", () => {
		const input: GroupOutcomesInput = {
			decisions: [makeDecision("d1", "agent-a")],
			outcomes: [
				makeOutcome("d1", "ok"),
				makeOutcome("d1", "wrong"),
				makeOutcome("d1", "too-low"),
				makeOutcome("d1", "too-high"),
			],
			weights: { manual: 1 },
		};
		const result = groupOutcomes(input);
		const cell = result.byAgent.get("agent-a")!;
		expect(cell.verdict_breakdown).toEqual({ ok: 1, wrong: 1, too_low: 1, too_high: 1 });
	});

	it("collects sample decision ids up to max 10", () => {
		const decisions = Array.from({ length: 12 }, (_, i) => makeDecision(`d${i}`, "agent-a"));
		const outcomes = Array.from({ length: 12 }, (_, i) => makeOutcome(`d${i}`, "ok"));
		const input: GroupOutcomesInput = {
			decisions,
			outcomes,
			weights: { manual: 1 },
		};
		const result = groupOutcomes(input);
		const cell = result.byAgent.get("agent-a")!;
		expect(cell.sample_decision_ids.length).toBe(10);
	});

	it("does not duplicate sample decision ids", () => {
		const input: GroupOutcomesInput = {
			decisions: [makeDecision("d1", "agent-a")],
			outcomes: [makeOutcome("d1", "ok"), makeOutcome("d1", "wrong")],
			weights: { manual: 1 },
		};
		const result = groupOutcomes(input);
		const cell = result.byAgent.get("agent-a")!;
		expect(cell.sample_decision_ids).toEqual(["d1"]);
	});
});
