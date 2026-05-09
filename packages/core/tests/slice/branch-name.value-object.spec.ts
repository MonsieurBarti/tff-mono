import { describe, it, expect } from "vitest";
import { BranchName } from "../../src/domain/slice/branch-name.value-object.js";
import { SliceKind } from "../../src/domain/slice/slice-kind.js";

describe("BranchName", () => {
	describe("create", () => {
		it("returns a BranchName with the given label when no prefix", () => {
			const branch = BranchName.create("my-label");
			expect(branch.value).toBe("my-label");
			expect(branch.label).toBe("my-label");
			expect(branch.prefix).toBe("");
		});

		it("returns a BranchName with prefix and label", () => {
			const branch = BranchName.create("my-label", "feature");
			expect(branch.value).toBe("feature/my-label");
			expect(branch.label).toBe("my-label");
			expect(branch.prefix).toBe("feature");
		});

		it("throws when label is empty", () => {
			expect(() => BranchName.create("")).toThrow();
		});

		it("throws when label contains path traversal", () => {
			expect(() => BranchName.create("../foo")).toThrow();
		});

		it("throws when label starts with slash", () => {
			expect(() => BranchName.create("/foo")).toThrow();
		});

		it("throws when label starts with hyphen", () => {
			expect(() => BranchName.create("-foo")).toThrow();
		});
	});

	describe("generate", () => {
		it("generates milestone branch as slice/<uuid-prefix>", () => {
			const branch = BranchName.generate("milestone" as SliceKind, 255);
			expect(branch.value).toMatch(/^slice\/[a-f0-9]{8}$/);
			expect(branch.prefix).toBe("slice");
			expect(branch.label).toHaveLength(8);
		});

		it("generates quick branch as quick/<number>", () => {
			const branch = BranchName.generate("quick" as SliceKind, 42);
			expect(branch.value).toBe("quick/42");
			expect(branch.prefix).toBe("quick");
			expect(branch.label).toBe("42");
		});

		it("generates debug branch as debug/<number>", () => {
			const branch = BranchName.generate("debug" as SliceKind, 7);
			expect(branch.value).toBe("debug/7");
			expect(branch.prefix).toBe("debug");
			expect(branch.label).toBe("7");
		});
	});

	describe("equals", () => {
		it("returns true for identical branch names", () => {
			const a = BranchName.create("foo", "bar");
			const b = BranchName.create("foo", "bar");
			expect(a.equals(b)).toBe(true);
		});

		it("returns false for different branch names", () => {
			const a = BranchName.create("foo", "bar");
			const b = BranchName.create("baz", "bar");
			expect(a.equals(b)).toBe(false);
		});
	});
});
