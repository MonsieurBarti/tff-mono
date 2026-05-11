import { describe, it, expect } from "vitest";
import {
	signalsToTagSet,
	scoreAgents,
	type WorkflowPool,
	type Signals,
} from "../../src/shared/routing-rubric.js";

describe("signalsToTagSet", () => {
	it("builds canonical tag set from signals", () => {
		const signals: Signals = {
			complexity: "high",
			risk: { level: "medium", tags: ["security", "performance"] },
		};
		const tags = signalsToTagSet(signals);
		expect(tags.has("high_complexity")).toBe(true);
		expect(tags.has("medium_risk")).toBe(true);
		expect(tags.has("security")).toBe(true);
		expect(tags.has("performance")).toBe(true);
		expect(tags.size).toBe(4);
	});

	it("ignores unknown future signal fields", () => {
		const signals = {
			complexity: "low",
			risk: { level: "low", tags: [] },
			tier_hint: "sonnet",
		} as unknown as Signals;
		const tags = signalsToTagSet(signals);
		expect(tags.has("low_complexity")).toBe(true);
		expect(tags.has("low_risk")).toBe(true);
		expect(tags.has("tier_hint")).toBe(false);
	});
});

describe("scoreAgents", () => {
	it("ranks agents by match_ratio descending", () => {
		const pool: WorkflowPool = {
			workflow_id: "wf-1",
			agents: [
				{ id: "a1", handles: ["high_complexity", "security"], priority: 1 },
				{ id: "a2", handles: ["high_complexity", "security", "performance"], priority: 1 },
			],
			default_agent: "a1",
		};
		const signals: Signals = {
			complexity: "high",
			risk: { level: "medium", tags: ["security", "performance"] },
		};
		const ranked = scoreAgents(pool, signals);
		expect(ranked[0].agent.id).toBe("a2");
		expect(ranked[0].match_ratio).toBeCloseTo(0.75);
		expect(ranked[1].agent.id).toBe("a1");
		expect(ranked[1].match_ratio).toBeCloseTo(0.5);
	});

	it("breaks ties by priority descending", () => {
		const pool: WorkflowPool = {
			workflow_id: "wf-1",
			agents: [
				{ id: "a1", handles: ["high_complexity"], priority: 5 },
				{ id: "a2", handles: ["high_complexity"], priority: 10 },
			],
			default_agent: "a1",
		};
		const signals: Signals = {
			complexity: "high",
			risk: { level: "low", tags: [] },
		};
		const ranked = scoreAgents(pool, signals);
		expect(ranked[0].agent.id).toBe("a2");
		expect(ranked[1].agent.id).toBe("a1");
	});

	it("handles empty signal tags gracefully", () => {
		const pool: WorkflowPool = {
			workflow_id: "wf-1",
			agents: [{ id: "a1", handles: [], priority: 1 }],
			default_agent: "a1",
		};
		const signals: Signals = {
			complexity: "low",
			risk: { level: "low", tags: [] },
		};
		const ranked = scoreAgents(pool, signals);
		expect(ranked[0].match_ratio).toBe(0);
	});

	it("handles agents with no matching handles", () => {
		const pool: WorkflowPool = {
			workflow_id: "wf-1",
			agents: [{ id: "a1", handles: ["irrelevant"], priority: 1 }],
			default_agent: "a1",
		};
		const signals: Signals = {
			complexity: "high",
			risk: { level: "medium", tags: ["security"] },
		};
		const ranked = scoreAgents(pool, signals);
		expect(ranked[0].match_ratio).toBe(0);
	});
});
