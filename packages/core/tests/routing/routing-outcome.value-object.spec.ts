import { describe, it, expect } from "vitest";
import {
	RoutingOutcome,
	type RoutingOutcomeProps,
} from "../../src/domain/routing/routing-outcome.value-object.js";

function makeProps(overrides?: Partial<RoutingOutcomeProps>): RoutingOutcomeProps {
	return {
		outcomeId: "out-1",
		decisionId: "dec-1",
		dimension: "tier",
		verdict: "ok",
		source: "model-judge",
		sliceId: "slice-1",
		workflowId: "wf-1",
		emittedAt: "2026-05-11T10:00:00Z",
		...overrides,
	};
}

describe("RoutingOutcome", () => {
	describe("create", () => {
		it("returns a RoutingOutcome for valid tier×ok", () => {
			const outcome = RoutingOutcome.create(makeProps());
			expect(outcome.outcomeId).toBe("out-1");
			expect(outcome.decisionId).toBe("dec-1");
			expect(outcome.dimension).toBe("tier");
			expect(outcome.verdict).toBe("ok");
			expect(outcome.source).toBe("model-judge");
			expect(outcome.sliceId).toBe("slice-1");
			expect(outcome.workflowId).toBe("wf-1");
			expect(outcome.emittedAt).toBe("2026-05-11T10:00:00Z");
			expect(outcome.reason).toBeUndefined();
		});

		it("returns a RoutingOutcome with reason when provided", () => {
			const outcome = RoutingOutcome.create(makeProps({ reason: "looks good" }));
			expect(outcome.reason).toBe("looks good");
		});

		it("returns a RoutingOutcome for valid agent×ok", () => {
			const outcome = RoutingOutcome.create(makeProps({ dimension: "agent", verdict: "ok" }));
			expect(outcome.dimension).toBe("agent");
			expect(outcome.verdict).toBe("ok");
		});

		it("returns a RoutingOutcome for valid agent×wrong", () => {
			const outcome = RoutingOutcome.create(makeProps({ dimension: "agent", verdict: "wrong" }));
			expect(outcome.dimension).toBe("agent");
			expect(outcome.verdict).toBe("wrong");
		});

		it("returns a RoutingOutcome for valid unknown×wrong", () => {
			const outcome = RoutingOutcome.create(makeProps({ dimension: "unknown", verdict: "wrong" }));
			expect(outcome.dimension).toBe("unknown");
			expect(outcome.verdict).toBe("wrong");
		});

		it("throws for invalid agent×too-low", () => {
			expect(() =>
				RoutingOutcome.create(makeProps({ dimension: "agent", verdict: "too-low" })),
			).toThrow();
		});

		it("throws for invalid agent×too-high", () => {
			expect(() =>
				RoutingOutcome.create(makeProps({ dimension: "agent", verdict: "too-high" })),
			).toThrow();
		});

		it("throws for invalid unknown×ok", () => {
			expect(() =>
				RoutingOutcome.create(makeProps({ dimension: "unknown", verdict: "ok" })),
			).toThrow();
		});
	});

	describe("equals", () => {
		it("returns true for identical outcomes", () => {
			const a = RoutingOutcome.create(makeProps());
			const b = RoutingOutcome.create(makeProps());
			expect(a.equals(b)).toBe(true);
		});

		it("returns false for different verdict", () => {
			const a = RoutingOutcome.create(makeProps());
			const b = RoutingOutcome.create(makeProps({ verdict: "wrong" }));
			expect(a.equals(b)).toBe(false);
		});

		it("returns false for different reason", () => {
			const a = RoutingOutcome.create(makeProps({ reason: "a" }));
			const b = RoutingOutcome.create(makeProps({ reason: "b" }));
			expect(a.equals(b)).toBe(false);
		});
	});
});
