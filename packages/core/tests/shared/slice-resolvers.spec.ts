import { describe, it, expect } from "vitest";
import { resolveBaseBranch, resolveBranchName } from "../../src/shared/slice-resolvers.js";

describe("resolveBaseBranch", () => {
	it("returns slice.baseBranch when present", () => {
		expect(resolveBaseBranch({ id: "s1", baseBranch: "feature/foo" })).toBe("feature/foo");
	});

	it("returns milestone.branch when slice has no baseBranch", () => {
		expect(resolveBaseBranch({ id: "s1" }, { branch: "milestone/abc12345" })).toBe(
			"milestone/abc12345",
		);
	});

	it("prefers slice.baseBranch over milestone.branch", () => {
		expect(
			resolveBaseBranch({ id: "s1", baseBranch: "custom-base" }, { branch: "milestone/abc12345" }),
		).toBe("custom-base");
	});

	it("throws when neither baseBranch nor milestone branch exists", () => {
		expect(() => resolveBaseBranch({ id: "s1" })).toThrow(
			"resolveBaseBranch: slice s1 has no base_branch and no parent milestone branch",
		);
	});
});

describe("resolveBranchName", () => {
	it("returns slice.branchName when present", () => {
		expect(resolveBranchName({ id: "s1", branchName: "custom/branch" })).toBe("custom/branch");
	});

	it("falls back to sliceBranchName from id when no branchName", () => {
		expect(resolveBranchName({ id: "abcdef12-3456-7890-abcd-ef1234567890" })).toBe(
			"slice/abcdef12",
		);
	});
});
