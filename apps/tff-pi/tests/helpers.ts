/**
 * Assert a value is not null/undefined and return it narrowed.
 * Use in tests instead of non-null assertion (!) to satisfy biome.
 */
export function must<T>(value: T | null | undefined, msg = "Expected value to be defined"): T {
	if (value == null) throw new Error(msg);
	return value;
}

// ---------------------------------------------------------------------------
// Entity factories — complete mock objects for DTOs
// ---------------------------------------------------------------------------

import type { Project, Milestone, Slice, Task } from "../src/common/dto.js";

export function makeProject(p: Partial<Project> = {}): Project {
	return {
		id: "p1",
		name: "Test",
		vision: "A test project",
		createdAt: "2026-04-10T00:00:00Z",
		updatedAt: "2026-04-10T00:00:00Z",
		...p,
	};
}

export function makeMilestone(p: Partial<Milestone> = {}): Milestone {
	return {
		id: "m1",
		projectId: "p1",
		number: 1,
		name: "Foundation",
		status: "created",
		branch: "milestone/M01",
		closeReason: null,
		createdAt: "2026-04-10T00:00:00Z",
		updatedAt: "2026-04-10T00:00:00Z",
		archivedAt: null,
		...p,
	};
}

export function makeSlice(p: Partial<Slice> = {}): Slice {
	return {
		id: "s1",
		milestoneId: "m1",
		kind: "milestone",
		number: 1,
		title: "Auth",
		status: "created",
		tier: null,
		baseBranch: "main",
		branchName: "feat/auth",
		prUrl: null,
		createdAt: "2026-04-10T00:00:00Z",
		updatedAt: "2026-04-10T00:00:00Z",
		archivedAt: null,
		...p,
	};
}

export function makeTask(p: Partial<Task> = {}): Task {
	return {
		id: "t1",
		sliceId: "s1",
		number: 1,
		title: "User entity",
		description: "",
		status: "open",
		wave: null,
		difficulty: null,
		claimedAt: null,
		claimedBy: null,
		closedReason: null,
		createdAt: "2026-04-10T00:00:00Z",
		updatedAt: "2026-04-10T00:00:00Z",
		...p,
	};
}
