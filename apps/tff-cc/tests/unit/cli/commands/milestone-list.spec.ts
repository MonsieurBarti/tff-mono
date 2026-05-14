import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockClosableStateStores } from "../helpers/mock-stores.js";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { milestoneListCmd } from "../../../../src/cli/commands/milestone-list.cmd.js";

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
	adapter.createMilestone({ number: 2, name: "Milestone Two" });
	return adapter;
}

describe("milestone:list", () => {
	beforeEach(() => {
		setAdapter(seedAdapter());
	});

	afterEach(() => {
		getAdapter()?.close();
	});

	it("returns help when --help is passed", async () => {
		const result = JSON.parse(await milestoneListCmd(["--help"]));
		expect(result.ok).toBe(true);
		expect(result.data.name).toBe("milestone:list");
	});

	it("lists all milestones", async () => {
		const result = JSON.parse(await milestoneListCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data).toHaveLength(2);
		expect(result.data[0].name).toBe("Milestone One");
		expect(result.data[1].name).toBe("Milestone Two");
	});
});
