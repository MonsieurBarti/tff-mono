import { beforeEach, describe, expect, it, vi } from "vitest";
import { Ok } from "@tff/core";
import type { ClosableStateStores } from "../../../../src/infrastructure/adapters/sqlite/create-state-stores.js";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { depAddCmd } from "../../../../src/cli/commands/dep-add.cmd.js";

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

function seedAdapter(): { adapter: SQLiteStateAdapter; sliceId: string; taskId: string } {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	adapter.saveProject({ name: "Test Project" });
	adapter.createMilestone({ number: 1, name: "Milestone One" });
	const msR = adapter.listMilestones();
	if (!msR.ok || msR.data.length === 0) throw new Error("No milestones seeded");
	const milestoneId = msR.data[0].id;
	adapter.createSlice({ milestoneId, number: 1, title: "Slice One", id: "M01-S01" });
	const sliceId = "M01-S01";
	const t1 = adapter.createTask({ sliceId, number: 1, title: "Task One" });
	if (!t1.ok) throw new Error("no task");
	adapter.createTask({ sliceId, number: 2, title: "Task Two" });
	const tasks = adapter.listTasks(sliceId);
	if (!tasks.ok || tasks.data.length === 0) throw new Error("no tasks");
	const taskId = tasks.data[0].id;
	return { adapter, sliceId, taskId };
}

describe("dep:add", () => {
	beforeEach(() => {
		const { adapter } = seedAdapter();
		setAdapter(adapter);
	});

	it("adds a task dependency", async () => {
		const { taskId } = seedAdapter();
		const tasks = getAdapter()!.listTasks(seedAdapter().sliceId);
		if (!tasks.ok || tasks.data.length < 2) throw new Error("need 2 tasks");
		const t2 = tasks.data[1].id;
		const result = JSON.parse(await depAddCmd(["--from-id", t2, "--to-id", taskId]));
		expect(result.ok).toBe(true);
	});

	it("adds a slice dependency", async () => {
		const adapter = getAdapter()!;
		adapter.createMilestone({ number: 2, name: "Milestone Two" });
		const msR = adapter.listMilestones();
		if (!msR.ok) throw new Error("no ms");
		const m2 = msR.data.find((m) => m.number === 2);
		if (!m2) throw new Error("no m2");
		adapter.createSlice({ milestoneId: m2.id, number: 1, title: "Slice Two", id: "M02-S01" });
		const from = "M02-S01";
		const to = "M01-S01";
		setAdapter(adapter);
		const result = JSON.parse(
			await depAddCmd(["--from-id", from, "--to-id", to, "--type", "slice"]),
		);
		expect(result.ok).toBe(true);
	});

	it("fails for invalid slice-id in slice dependency", async () => {
		const result = JSON.parse(
			await depAddCmd(["--from-id", "invalid", "--to-id", "M01-S01", "--type", "slice"]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("VALIDATION_ERROR");
	});

	it("fails when missing required flags", async () => {
		const result = JSON.parse(await depAddCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
