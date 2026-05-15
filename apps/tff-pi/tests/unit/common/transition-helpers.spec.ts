import { describe, expect, it } from "vitest";
import { HUMAN_GATES, MILESTONE_TRANSITIONS, SLICE_TRANSITIONS } from "@tff/core";

describe("state-machine", () => {
	describe("SLICE_TRANSITIONS", () => {
		it("defines transitions for all slice statuses", () => {
			expect(SLICE_TRANSITIONS).toHaveProperty("created");
			expect(SLICE_TRANSITIONS).toHaveProperty("discussing");
			expect(SLICE_TRANSITIONS).toHaveProperty("researching");
			expect(SLICE_TRANSITIONS).toHaveProperty("planning");
			expect(SLICE_TRANSITIONS).toHaveProperty("executing");
			expect(SLICE_TRANSITIONS).toHaveProperty("verifying");
			expect(SLICE_TRANSITIONS).toHaveProperty("reviewing");
			expect(SLICE_TRANSITIONS).toHaveProperty("shipping");
			expect(SLICE_TRANSITIONS).toHaveProperty("closed");
		});
	});

	describe("canTransitionSlice", () => {
		it("allows valid forward path: created → discussing", () => {
			expect(SLICE_TRANSITIONS["created"].includes("discussing")).toBe(true);
		});

		it("allows valid forward path: discussing → researching", () => {
			expect(SLICE_TRANSITIONS["discussing"].includes("researching")).toBe(true);
		});

		it("allows S-tier skip: discussing → planning", () => {
			expect(SLICE_TRANSITIONS["discussing"].includes("planning")).toBe(true);
		});

		it("allows valid forward path: researching → planning", () => {
			expect(SLICE_TRANSITIONS["researching"].includes("planning")).toBe(true);
		});

		it("allows valid forward path: planning → executing", () => {
			expect(SLICE_TRANSITIONS["planning"].includes("executing")).toBe(true);
		});

		it("allows valid forward path: executing → verifying", () => {
			expect(SLICE_TRANSITIONS["executing"].includes("verifying")).toBe(true);
		});

		it("allows back-edge: verifying → executing (AC fail)", () => {
			expect(SLICE_TRANSITIONS["verifying"].includes("executing")).toBe(true);
		});

		it("allows valid forward path: verifying → reviewing", () => {
			expect(SLICE_TRANSITIONS["verifying"].includes("reviewing")).toBe(true);
		});

		it("allows back-edge: reviewing → executing (changes requested)", () => {
			expect(SLICE_TRANSITIONS["reviewing"].includes("executing")).toBe(true);
		});

		it("allows valid forward path: reviewing → shipping", () => {
			expect(SLICE_TRANSITIONS["reviewing"].includes("shipping")).toBe(true);
		});

		it("allows valid forward path: shipping → closed", () => {
			expect(SLICE_TRANSITIONS["shipping"].includes("closed")).toBe(true);
		});

		it("rejects invalid transition: created → planning", () => {
			expect(SLICE_TRANSITIONS["created"].includes("planning")).toBe(false);
		});

		it("rejects invalid transition: closed → discussing", () => {
			expect(SLICE_TRANSITIONS["closed"].includes("discussing")).toBe(false);
		});

		it("rejects invalid transition: executing → discussing", () => {
			expect(SLICE_TRANSITIONS["executing"].includes("discussing")).toBe(false);
		});

		it("rejects self-transition", () => {
			expect(SLICE_TRANSITIONS["discussing"].includes("discussing")).toBe(false);
		});
	});

	describe("isHumanGate", () => {
		it("returns true for discussing", () => {
			expect(HUMAN_GATES.includes("discussing")).toBe(true);
		});

		it("returns true for planning", () => {
			expect(HUMAN_GATES.includes("planning")).toBe(true);
		});

		it("returns true for shipping", () => {
			expect(HUMAN_GATES.includes("shipping")).toBe(true);
		});

		it("returns false for executing", () => {
			expect(HUMAN_GATES.includes("executing")).toBe(false);
		});

		it("returns false for verifying", () => {
			expect(HUMAN_GATES.includes("verifying")).toBe(false);
		});

		it("returns false for closed", () => {
			expect(HUMAN_GATES.includes("closed")).toBe(false);
		});
	});

	describe("HUMAN_GATES", () => {
		it("contains discussing, planning, shipping", () => {
			expect(HUMAN_GATES).toEqual(["discussing", "planning", "shipping"]);
		});
	});

	describe("canTransitionMilestone", () => {
		it("allows created → in_progress", () => {
			expect(MILESTONE_TRANSITIONS["created"].includes("in_progress")).toBe(true);
		});

		it("allows in_progress → completing", () => {
			expect(MILESTONE_TRANSITIONS["in_progress"].includes("completing")).toBe(true);
		});

		it("allows completing → closed", () => {
			expect(MILESTONE_TRANSITIONS["completing"].includes("closed")).toBe(true);
		});

		it("rejects closed → any", () => {
			expect(MILESTONE_TRANSITIONS["closed"].includes("in_progress")).toBe(false);
			expect(MILESTONE_TRANSITIONS["closed"].includes("created")).toBe(false);
		});

		it("rejects skipping: created → completing", () => {
			expect(MILESTONE_TRANSITIONS["created"].includes("completing")).toBe(false);
		});

		it("rejects backwards: in_progress → created", () => {
			expect(MILESTONE_TRANSITIONS["in_progress"].includes("created")).toBe(false);
		});

		it("rejects self-transition", () => {
			expect(MILESTONE_TRANSITIONS["in_progress"].includes("in_progress")).toBe(false);
		});
	});
});
