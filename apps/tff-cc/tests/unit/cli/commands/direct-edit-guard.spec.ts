import { beforeEach, describe, expect, it, vi } from "vitest";
import { Ok } from "@tff/core";
import type { ClosableStateStores } from "../../../../src/infrastructure/adapters/sqlite/create-state-stores.js";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { directEditGuardCmd } from "../../../../src/cli/commands/direct-edit-guard.cmd.js";

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

const { getProjectInitialized, setProjectInitialized } = vi.hoisted(() => {
	let _init = true;
	return {
		getProjectInitialized: () => _init,
		setProjectInitialized: (v: boolean) => {
			_init = v;
		},
	};
});

const { getSettingsExists, setSettingsExists } = vi.hoisted(() => {
	let _exists = false;
	return {
		getSettingsExists: () => _exists,
		setSettingsExists: (v: boolean) => {
			_exists = v;
		},
	};
});

const { getSettingsContent, setSettingsContent } = vi.hoisted(() => {
	let _content = "";
	return {
		getSettingsContent: () => _content,
		setSettingsContent: (v: string) => {
			_content = v;
		},
	};
});

vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs")>();
	return {
		...actual,
		existsSync: vi.fn((p: string) => {
			if (p.includes(".tff")) return getProjectInitialized();
			if (p.includes("settings.yaml")) return getSettingsExists();
			return actual.existsSync(p);
		}),
		readFileSync: vi.fn((p: string, ...args: any[]) => {
			if (p.includes("settings.yaml")) return getSettingsContent();
			return actual.readFileSync(p, ...args);
		}),
	};
});

vi.mock("../../../../src/infrastructure/home-directory.js", () => ({
	resolveRepoRoot: () => "/test-repo",
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
	return adapter;
}

describe("direct-edit:guard", () => {
	beforeEach(() => {
		const adapter = seedAdapter();
		setAdapter(adapter);
		setProjectInitialized(true);
		setSettingsExists(false);
		setSettingsContent("");
	});

	it("returns help when --help is passed", async () => {
		const result = JSON.parse(await directEditGuardCmd(["--help"]));
		expect(result.ok).toBe(true);
		expect(result.data.name).toBe("direct-edit:guard");
	});

	it("returns null warning when guards are disabled", async () => {
		setSettingsExists(true);
		setSettingsContent("workflow:\n  guards: false\n");
		const result = JSON.parse(await directEditGuardCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.warning).toBeNull();
	});

	it("returns null warning when project not initialized", async () => {
		setProjectInitialized(false);
		const result = JSON.parse(await directEditGuardCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.warning).toBeNull();
	});

	it("warns when no active session", async () => {
		const result = JSON.parse(await directEditGuardCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.warning).not.toBeNull();
	});

	it("warns when active slice but no claimed task", async () => {
		const adapter = getAdapter()!;
		adapter.saveSession({ phase: "executing", activeSliceId: "M01-S01" });
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Unclaimed Task" });
		setAdapter(adapter);
		const result = JSON.parse(await directEditGuardCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.warning).not.toBeNull();
	});

	it("returns null warning when claimed task exists", async () => {
		const adapter = getAdapter()!;
		adapter.saveSession({ phase: "executing", activeSliceId: "M01-S01" });
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Claimed Task" });
		adapter.claimTask("M01-S01-T01", "agent");
		setAdapter(adapter);
		const result = JSON.parse(await directEditGuardCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.warning).toBeNull();
	});
});
