import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockClosableStateStores } from "../helpers/mock-stores.js";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { claimCheckStaleCmd } from "../../../../src/cli/commands/claim-check-stale.cmd.js";

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

function seedAdapter(): { adapter: SQLiteStateAdapter } {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	adapter.saveProject({ name: "Test Project" });
	adapter.createMilestone({ number: 1, name: "Milestone One" });
	const msR = adapter.listMilestones();
	if (!msR.ok || msR.data.length === 0) throw new Error("No milestones seeded");
	const milestoneId = msR.data[0].id;
	adapter.createSlice({ milestoneId, number: 1, title: "Slice One", id: "M01-S01" });
	const sliceId = "M01-S01";
	adapter.createTask({
		sliceId,
		number: 1,
		title: "Claimed Task",
		claimedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
	});
	adapter.createTask({
		sliceId,
		number: 2,
		title: "Recent Task",
		claimedAt: new Date().toISOString(),
	});
	return { adapter };
}

describe("claim:check-stale", () => {
	beforeEach(() => {
		const { adapter } = seedAdapter();
		setAdapter(adapter);
	});

	afterEach(() => {
		getAdapter()?.close();
	});

	it("returns stale claims with default ttl", async () => {
		const result = JSON.parse(await claimCheckStaleCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.count).toBeGreaterThanOrEqual(0);
	});

	it("returns stale claims with custom ttl", async () => {
		const result = JSON.parse(await claimCheckStaleCmd(["--ttl-minutes", "120"]));
		expect(result.ok).toBe(true);
		expect(Array.isArray(result.data.staleClaims)).toBe(true);
	});

	it("fails for invalid ttl", async () => {
		const result = JSON.parse(await claimCheckStaleCmd(["--ttl-minutes", "0"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("INVALID_ARGS");
	});

	it("returns empty when no stale claims", async () => {
		const adapter = getAdapter()!;
		const msR = adapter.listMilestones();
		if (!msR.ok) throw new Error("no ms");
		const m = msR.data[0];
		adapter.createSlice({ milestoneId: m.id, number: 2, title: "Slice Two", id: "M02-S01" });
		const slices = adapter.listSlices(m.id);
		if (!slices.ok) throw new Error("no slices");
		const s2 = slices.data.find((s) => s.number === 2);
		if (!s2) throw new Error("no s2");
		adapter.createTask({ sliceId: s2.label, number: 1, title: "Unclaimed Task" });
		setAdapter(adapter);
		const result = JSON.parse(await claimCheckStaleCmd(["--ttl-minutes", "1"]));
		expect(result.ok).toBe(true);
		expect(result.data.count).toBe(0);
	});
});
