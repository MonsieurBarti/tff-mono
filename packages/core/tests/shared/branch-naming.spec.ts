import { describe, it, expect } from "vitest";
import {
	milestoneLabel,
	sliceLabel,
	milestoneBranchName,
	sliceBranchName,
	adhocSliceLabel,
	sliceLabelFor,
} from "../../src/shared/branch-naming.js";

describe("milestoneLabel", () => {
	it("formats single-digit numbers with zero pad", () => {
		expect(milestoneLabel(1)).toBe("M01");
		expect(milestoneLabel(9)).toBe("M09");
	});

	it("formats multi-digit numbers without extra pad", () => {
		expect(milestoneLabel(10)).toBe("M10");
		expect(milestoneLabel(99)).toBe("M99");
	});
});

describe("sliceLabel", () => {
	it("formats milestone-bound slice labels", () => {
		expect(sliceLabel(1, 1)).toBe("M01-S01");
		expect(sliceLabel(3, 12)).toBe("M03-S12");
	});
});

describe("milestoneBranchName", () => {
	it("uses first 8 chars of UUID with milestone/ prefix", () => {
		expect(milestoneBranchName("abcdef12-3456-7890-abcd-ef1234567890")).toBe("milestone/abcdef12");
	});
});

describe("sliceBranchName", () => {
	it("uses first 8 chars of UUID with slice/ prefix", () => {
		expect(sliceBranchName("abcdef12-3456-7890-abcd-ef1234567890")).toBe("slice/abcdef12");
	});
});

describe("adhocSliceLabel", () => {
	it("formats quick slices as Q-##", () => {
		expect(adhocSliceLabel("quick", 1)).toBe("Q-01");
		expect(adhocSliceLabel("quick", 10)).toBe("Q-10");
	});

	it("formats debug slices as D-##", () => {
		expect(adhocSliceLabel("debug", 2)).toBe("D-02");
		expect(adhocSliceLabel("debug", 99)).toBe("D-99");
	});
});

describe("sliceLabelFor", () => {
	it("returns milestone-bound label when kind is milestone", () => {
		expect(sliceLabelFor({ kind: "milestone", number: 3 }, { number: 2 })).toBe("M02-S03");
	});

	it("returns quick label when kind is quick", () => {
		expect(sliceLabelFor({ kind: "quick", number: 5 })).toBe("Q-05");
	});

	it("returns debug label when kind is debug", () => {
		expect(sliceLabelFor({ kind: "debug", number: 7 })).toBe("D-07");
	});

	it("throws when milestone-bound slice has no parent milestone", () => {
		expect(() => sliceLabelFor({ kind: "milestone", number: 1 })).toThrow(
			"sliceLabelFor: milestone required when slice.kind === 'milestone'",
		);
	});
});
