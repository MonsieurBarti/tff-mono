import { describe, it, expect } from "vitest";
import {
	JudgeVerdict,
	type JudgeVerdictProps,
} from "../../src/domain/routing/judge-verdict.value-object.js";

function makeProps(overrides?: Partial<JudgeVerdictProps>): JudgeVerdictProps {
	return {
		decisionId: "dec-1",
		dimension: "tier",
		verdict: "ok",
		reason: "correct routing",
		...overrides,
	};
}

describe("JudgeVerdict", () => {
	describe("create", () => {
		it("returns a JudgeVerdict for valid tier×ok", () => {
			const verdict = JudgeVerdict.create(makeProps());
			expect(verdict.decisionId).toBe("dec-1");
			expect(verdict.dimension).toBe("tier");
			expect(verdict.verdict).toBe("ok");
			expect(verdict.reason).toBe("correct routing");
		});

		it("returns a JudgeVerdict for valid agent×ok", () => {
			const verdict = JudgeVerdict.create(makeProps({ dimension: "agent", verdict: "ok" }));
			expect(verdict.dimension).toBe("agent");
			expect(verdict.verdict).toBe("ok");
		});

		it("returns a JudgeVerdict for valid agent×wrong", () => {
			const verdict = JudgeVerdict.create(makeProps({ dimension: "agent", verdict: "wrong" }));
			expect(verdict.dimension).toBe("agent");
			expect(verdict.verdict).toBe("wrong");
		});

		it("throws for invalid agent×too-low", () => {
			expect(() =>
				JudgeVerdict.create(makeProps({ dimension: "agent", verdict: "too-low" })),
			).toThrow();
		});

		it("throws for invalid agent×too-high", () => {
			expect(() =>
				JudgeVerdict.create(makeProps({ dimension: "agent", verdict: "too-high" })),
			).toThrow();
		});
	});

	describe("equals", () => {
		it("returns true for identical verdicts", () => {
			const a = JudgeVerdict.create(makeProps());
			const b = JudgeVerdict.create(makeProps());
			expect(a.equals(b)).toBe(true);
		});

		it("returns false for different verdict", () => {
			const a = JudgeVerdict.create(makeProps());
			const b = JudgeVerdict.create(makeProps({ verdict: "wrong" }));
			expect(a.equals(b)).toBe(false);
		});

		it("returns false for different reason", () => {
			const a = JudgeVerdict.create(makeProps());
			const b = JudgeVerdict.create(makeProps({ reason: "different" }));
			expect(a.equals(b)).toBe(false);
		});
	});
});
