import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockClosableStateStores } from "../helpers/mock-stores.js";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { reviewCheckFreshCmd } from "../../../../src/cli/commands/review-check-fresh.cmd.js";

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
	adapter.claimTask(`${sliceId}-T01`, "executor-agent");
	return { adapter, sliceId };
}

describe("review:check-fresh", () => {
	beforeEach(() => {
		const { adapter } = seedAdapter();
		setAdapter(adapter);
	});

	afterEach(() => {
		getAdapter()?.close();
	});

	it("passes for fresh reviewer", async () => {
		const result = JSON.parse(
			await reviewCheckFreshCmd(["--slice-id", "M01-S01", "--agent", "fresh-reviewer"]),
		);
		expect(result.ok).toBe(true);
	});

	it("fails for stale reviewer (same as executor)", async () => {
		const result = JSON.parse(
			await reviewCheckFreshCmd(["--slice-id", "M01-S01", "--agent", "executor-agent"]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("FRESH_REVIEWER_VIOLATION");
	});

	it("fails when missing required flags", async () => {
		const result = JSON.parse(await reviewCheckFreshCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
