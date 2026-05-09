import { describe, it, expect } from "vitest";
import { TaskDependency } from "../../src/domain/task/task-dependency.value-object.js";

describe("TaskDependency", () => {
	it("creates a dependency with fromId and toId", () => {
		const dep = TaskDependency.create("task-a", "task-b");
		expect(dep.fromId).toBe("task-a");
		expect(dep.toId).toBe("task-b");
	});

	it("equals returns true for same ids", () => {
		const a = TaskDependency.create("x", "y");
		const b = TaskDependency.create("x", "y");
		expect(a.equals(b)).toBe(true);
	});

	it("equals returns false for different ids", () => {
		const a = TaskDependency.create("x", "y");
		const b = TaskDependency.create("x", "z");
		const c = TaskDependency.create("w", "y");
		expect(a.equals(b)).toBe(false);
		expect(a.equals(c)).toBe(false);
	});

	it("throws when fromId is empty", () => {
		expect(() => TaskDependency.create("", "task-b")).toThrow();
	});

	it("throws when toId is empty", () => {
		expect(() => TaskDependency.create("task-a", "")).toThrow();
	});
});
