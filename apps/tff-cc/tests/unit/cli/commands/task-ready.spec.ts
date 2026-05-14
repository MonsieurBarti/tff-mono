import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockClosableStateStores } from "../helpers/mock-stores.js";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { taskReadyCmd } from "../../../../src/cli/commands/task-ready.cmd.js";

const { getAdapter, setAdapter } = vi.hoisted(() => {
	let _adapter: SQLiteStateAdapter | null = null;
	return {
		getAdapter: () => _adapter,
		setAdapter: (a: SQLiteStateAdapter) => {
			_adapter = a;
		},
	};
});

vi.mock("../../../../src/infrastructure/adapters/sqlite/create-state-stores.js", () => ({
	createClosableStateStoresUnchecked: vi.fn(() => createMockClosableStateStores(getAdapter()!)),
}));

function seedAdapter(): { adapter: SQLiteStateAdapter; sliceId: string } {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	adapter.saveProject({ name: "Test Project" });
	adapter.createMilestone({ number: 1, name: "Milestone One" });
	const msR = adapter.listMilestones();
	if (!msR.ok || msR.data.length === 0) throw new Error("No milestones seeded");
	const milestoneId = msR.data[0].id;
	adapter.createSlice({ milestoneId, number: 1, title: "Slice One", id: "M01-S01" });
	const sliceId = "M01-S01";
	adapter.createTask({ sliceId, number: 1, title: "Task One" });
	return { adapter, sliceId };
}

describe("task:ready", () => {
	beforeEach(() => {
		const { adapter } = seedAdapter();
		setAdapter(adapter);
	});

	afterEach(() => {
		getAdapter()?.close();
	});

	it("lists ready tasks for a valid slice-id", async () => {
		const result = JSON.parse(await taskReadyCmd(["--slice-id", "M01-S01"]));
		expect(result.ok).toBe(true);
		expect(Array.isArray(result.data)).toBe(true);
	});

	it("returns empty array when no ready tasks", async () => {
		const adapter = getAdapter()!;
		adapter.createMilestone({ number: 2, name: "Milestone Two" });
		const msR = adapter.listMilestones();
		if (!msR.ok) throw new Error("failed");
		const m2 = msR.data.find((m) => m.number === 2);
		if (!m2) throw new Error("no m2");
		adapter.createSlice({ milestoneId: m2.id, number: 1, title: "Empty Slice" });
		const emptySliceId = "M02-S01";
		const result = JSON.parse(await taskReadyCmd(["--slice-id", emptySliceId]));
		expect(result.ok).toBe(true);
		expect(result.data).toEqual([]);
	});

	it("fails for invalid slice-id format", async () => {
		const result = JSON.parse(await taskReadyCmd(["--slice-id", "invalid"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PATTERN_MISMATCH");
	});

	it("fails when missing required flag", async () => {
		const result = JSON.parse(await taskReadyCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
