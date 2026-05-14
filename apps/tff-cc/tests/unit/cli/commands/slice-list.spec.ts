import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockClosableStateStores } from "../helpers/mock-stores.js";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { sliceListCmd } from "../../../../src/cli/commands/slice-list.cmd.js";

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

vi.mock("../../../../src/application/reconcile/reconcile-on-read.js", () => ({
	reconcileOnRead: async () => {},
}));

function seedAdapter(): SQLiteStateAdapter {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	adapter.saveProject({ name: "Test Project" });
	adapter.createMilestone({ number: 1, name: "Milestone One" });
	const msR = adapter.listMilestones();
	if (!msR.ok || msR.data.length === 0) throw new Error("No milestones seeded");
	const milestoneId = msR.data[0].id;
	adapter.createSlice({ milestoneId, number: 1, title: "Slice One", id: "M01-S01" });
	adapter.createSlice({
		milestoneId,
		number: 2,
		title: "Quick Slice",
		id: "M01-S02",
		kind: "quick",
		baseBranch: "main",
	});
	adapter.createSlice({
		milestoneId,
		number: 3,
		title: "Debug Slice",
		id: "M01-S03",
		kind: "debug",
		baseBranch: "main",
	});
	return adapter;
}

describe("slice:list", () => {
	beforeEach(() => {
		setAdapter(seedAdapter());
	});

	afterEach(() => {
		getAdapter()?.close();
	});

	it("lists all slices by default", async () => {
		const result = JSON.parse(await sliceListCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data).toHaveLength(3);
	});

	it("filters by milestone-id", async () => {
		const result = JSON.parse(await sliceListCmd(["--milestone-id", "M01"]));
		expect(result.ok).toBe(true);
		expect(result.data).toHaveLength(3);
	});

	it("filters by kind quick", async () => {
		const result = JSON.parse(await sliceListCmd(["--kind", "quick"]));
		expect(result.ok).toBe(true);
		expect(result.data).toHaveLength(1);
		expect(result.data[0].kind).toBe("quick");
	});

	it("filters by kind debug", async () => {
		const result = JSON.parse(await sliceListCmd(["--kind", "debug"]));
		expect(result.ok).toBe(true);
		expect(result.data).toHaveLength(1);
		expect(result.data[0].kind).toBe("debug");
	});

	it("filters by kind milestone", async () => {
		const result = JSON.parse(await sliceListCmd(["--kind", "milestone"]));
		expect(result.ok).toBe(true);
		expect(result.data).toHaveLength(1);
		expect(result.data[0].kind).toBe("milestone");
	});

	it("fails when --milestone-id and non-milestone --kind are combined", async () => {
		const result = JSON.parse(await sliceListCmd(["--milestone-id", "M01", "--kind", "quick"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("VALIDATION_ERROR");
	});

	it("fails for invalid milestone-id format", async () => {
		const result = JSON.parse(await sliceListCmd(["--milestone-id", "invalid"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("INVALID_INPUT");
	});

	it("fails for invalid kind enum", async () => {
		const result = JSON.parse(await sliceListCmd(["--kind", "invalid"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("INVALID_ENUM_VALUE");
	});
});
