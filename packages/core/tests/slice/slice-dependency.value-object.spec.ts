import { describe, it, expect } from "vitest";
import { SliceDependency } from "../../src/domain/slice/slice-dependency.value-object.js";

describe("SliceDependency", () => {
	it("creates a dependency with fromId and toId", () => {
		const dep = SliceDependency.create("slice-a", "slice-b");
		expect(dep.fromId).toBe("slice-a");
		expect(dep.toId).toBe("slice-b");
	});

	it("equals returns true for same ids", () => {
		const a = SliceDependency.create("x", "y");
		const b = SliceDependency.create("x", "y");
		expect(a.equals(b)).toBe(true);
	});

	it("equals returns false for different ids", () => {
		const a = SliceDependency.create("x", "y");
		const b = SliceDependency.create("x", "z");
		const c = SliceDependency.create("w", "y");
		expect(a.equals(b)).toBe(false);
		expect(a.equals(c)).toBe(false);
	});

	it("throws when fromId is empty", () => {
		expect(() => SliceDependency.create("", "slice-b")).toThrow();
	});

	it("throws when toId is empty", () => {
		expect(() => SliceDependency.create("slice-a", "")).toThrow();
	});
});
