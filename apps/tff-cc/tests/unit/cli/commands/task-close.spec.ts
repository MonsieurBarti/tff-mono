import { beforeEach, describe, expect, it, vi } from "vitest";
import { Ok } from "@tff/core";
import type { ClosableStateStores } from "../../../../src/infrastructure/adapters/sqlite/create-state-stores.js";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { taskCloseCmd } from "../../../../src/cli/commands/task-close.cmd.js";

const { getAdapter, setAdapter } = vi.hoisted(() => {
	let _adapter: SQLiteStateAdapter | null = null;
	return {
		getAdapter: () => _adapter,
		setAdapter: (a: SQLiteStateAdapter) => {
			_adapter = a;
		},
	};
});

const nullJournal = {
	append: () => Ok(0 as number),
	readAll: () => Ok([] as never[]),
	readSince: () => Ok([] as never[]),
	count: () => Ok(0 as number),
};

vi.mock("../../../../src/infrastructure/adapters/sqlite/create-state-stores.js", () => ({
	createClosableStateStoresUnchecked: vi.fn((): ClosableStateStores => {
		const adapter = getAdapter()!;
		return {
			db: adapter,
			projectStore: adapter,
			milestoneStore: adapter,
			sliceStore: adapter,
			taskStore: adapter,
			dependencyStore: adapter,
			sliceDependencyStore: adapter,
			sessionStore: adapter,
			reviewStore: adapter,
			milestoneAuditStore: adapter,
			pendingJudgmentStore: adapter,
			journalRepository: nullJournal,
			close: () => {},
			checkpoint: () => {},
		};
	}),
}));

function seedAdapter(): { adapter: SQLiteStateAdapter; taskId: string } {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	adapter.saveProject({ name: "Test Project" });
	adapter.createMilestone({ number: 1, name: "Milestone One" });
	const msR = adapter.listMilestones();
	if (!msR.ok || msR.data.length === 0) throw new Error("No milestones seeded");
	const milestoneId = msR.data[0].id;
	adapter.createSlice({ milestoneId, number: 1, title: "Slice One", id: "M01-S01" });
	adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Task One" });
	return { adapter, taskId: "M01-S01-T01" };
}

describe("task:close", () => {
	beforeEach(() => {
		const { adapter } = seedAdapter();
		setAdapter(adapter);
	});

	it("closes a task successfully", async () => {
		const { taskId } = seedAdapter();
		setAdapter(seedAdapter().adapter);
		const result = JSON.parse(await taskCloseCmd(["--task-id", taskId]));
		expect(result.ok).toBe(true);
		expect(result.data).toBeNull();
	});

	it("closes a task with reason", async () => {
		const { taskId } = seedAdapter();
		setAdapter(seedAdapter().adapter);
		const result = JSON.parse(await taskCloseCmd(["--task-id", taskId, "--reason", "Completed"]));
		expect(result.ok).toBe(true);
		expect(result.data).toBeNull();
	});

	it("fails when task not found", async () => {
		const result = JSON.parse(await taskCloseCmd(["--task-id", "M01-S01-T99"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("TASK_NOT_FOUND");
	});

	it("fails for invalid task-id format", async () => {
		const result = JSON.parse(await taskCloseCmd(["--task-id", "invalid"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PATTERN_MISMATCH");
	});

	it("fails when missing required flag", async () => {
		const result = JSON.parse(await taskCloseCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
