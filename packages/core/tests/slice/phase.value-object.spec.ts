import { describe, it, expect } from "vitest";
import {
	Phase,
	PHASE_VALUES,
	PIPELINE_PHASE_ORDER,
} from "../../src/domain/slice/phase.value-object.js";

describe("Phase", () => {
	it("exports the correct phase values", () => {
		expect(PHASE_VALUES).toEqual([
			"discuss",
			"research",
			"plan",
			"execute",
			"verify",
			"review",
			"ship",
		]);
	});

	it("exports the correct pipeline order", () => {
		expect(PIPELINE_PHASE_ORDER).toEqual([
			"discuss",
			"research",
			"plan",
			"execute",
			"verify",
			"review",
			"ship",
		]);
	});

	it("create returns a Phase for valid values", () => {
		for (const value of PHASE_VALUES) {
			const phase = Phase.create(value);
			expect(phase.value).toBe(value);
		}
	});

	it("create throws for invalid values", () => {
		expect(() => Phase.create("invalid")).toThrow();
	});

	it("order returns the index in pipeline order", () => {
		expect(Phase.create("discuss").order).toBe(0);
		expect(Phase.create("research").order).toBe(1);
		expect(Phase.create("plan").order).toBe(2);
		expect(Phase.create("execute").order).toBe(3);
		expect(Phase.create("verify").order).toBe(4);
		expect(Phase.create("review").order).toBe(5);
		expect(Phase.create("ship").order).toBe(6);
	});

	it("isBefore returns true when this phase comes before other", () => {
		const discuss = Phase.create("discuss");
		const plan = Phase.create("plan");
		expect(discuss.isBefore(plan)).toBe(true);
		expect(plan.isBefore(discuss)).toBe(false);
	});

	it("isAfter returns true when this phase comes after other", () => {
		const plan = Phase.create("plan");
		const discuss = Phase.create("discuss");
		expect(plan.isAfter(discuss)).toBe(true);
		expect(discuss.isAfter(plan)).toBe(false);
	});

	it("next returns the next phase or null", () => {
		expect(Phase.create("discuss").next()?.value).toBe("research");
		expect(Phase.create("research").next()?.value).toBe("plan");
		expect(Phase.create("plan").next()?.value).toBe("execute");
		expect(Phase.create("execute").next()?.value).toBe("verify");
		expect(Phase.create("verify").next()?.value).toBe("review");
		expect(Phase.create("review").next()?.value).toBe("ship");
		expect(Phase.create("ship").next()).toBeNull();
	});

	it("equals returns true for same value", () => {
		const a = Phase.create("plan");
		const b = Phase.create("plan");
		expect(a.equals(b)).toBe(true);
	});

	it("equals returns false for different values", () => {
		const a = Phase.create("plan");
		const b = Phase.create("execute");
		expect(a.equals(b)).toBe(false);
	});
});
