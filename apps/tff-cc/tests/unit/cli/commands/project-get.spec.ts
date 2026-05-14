import { beforeEach, describe, expect, it, vi } from "vitest";
import { Ok } from "@tff/core";
import type { ClosableStateStores } from "../../../../src/infrastructure/adapters/sqlite/create-state-stores.js";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { projectGetCmd } from "../../../../src/cli/commands/project-get.cmd.js";

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

vi.mock("../../../../src/application/reconcile/reconcile-on-read.js", () => ({
	reconcileOnRead: async () => {},
}));

describe("project:get", () => {
	beforeEach(() => {
		const adapter = SQLiteStateAdapter.createInMemory();
		adapter.init();
		setAdapter(adapter);
	});

	it("returns help when --help is passed", async () => {
		const result = JSON.parse(await projectGetCmd(["--help"]));
		expect(result.ok).toBe(true);
		expect(result.data.name).toBe("project:get");
	});

	it("returns project when initialized", async () => {
		const adapter = getAdapter()!;
		adapter.saveProject({ name: "Test Project", vision: "Testing" });
		setAdapter(adapter);
		const result = JSON.parse(await projectGetCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.name).toBe("Test Project");
	});

	it("returns NOT_FOUND when no project exists", async () => {
		const result = JSON.parse(await projectGetCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("NOT_FOUND");
	});
});
