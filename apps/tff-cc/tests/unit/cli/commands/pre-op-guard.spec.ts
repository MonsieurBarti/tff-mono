import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockClosableStateStores } from "../helpers/mock-stores.js";
import { Ok } from "@tff/core";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { preOpGuardCmd } from "../../../../src/cli/commands/pre-op-guard.cmd.js";

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

const { getGuardsDisabled, setGuardsDisabled } = vi.hoisted(() => {
	let _disabled = false;
	return {
		getGuardsDisabled: () => _disabled,
		setGuardsDisabled: (v: boolean) => {
			_disabled = v;
		},
	};
});

const { getProjectInitialized, setProjectInitialized } = vi.hoisted(() => {
	let _init = true;
	return {
		getProjectInitialized: () => _init,
		setProjectInitialized: (v: boolean) => {
			_init = v;
		},
	};
});

const { getLockSkipped, setLockSkipped } = vi.hoisted(() => {
	let _skipped = false;
	return {
		getLockSkipped: () => _skipped,
		setLockSkipped: (v: boolean) => {
			_skipped = v;
		},
	};
});

vi.mock("../../../../src/cli/with-sync-lock.js", () => ({
	withSyncLock: async (fn: any) => {
		if (getLockSkipped()) {
			return {
				ok: true,
				data: { action: "skipped", reason: "test" },
			};
		}
		return fn();
	},
}));

vi.mock("../../../../src/infrastructure/adapters/index.js", () => ({
	createAdapters: () => ({
		configReader: {
			readConfig: async () => Ok(!getGuardsDisabled()),
		},
	}),
}));

vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs")>();
	return {
		...actual,
		existsSync: vi.fn((p: string) => {
			if (p.includes(".tff")) return getProjectInitialized();
			return actual.existsSync(p);
		}),
	};
});

vi.mock("../../../../src/infrastructure/home-directory.js", () => ({
	resolveRepoRoot: () => "/test-repo",
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
	adapter.transitionSlice("M01-S01", "discussing");
	return { adapter, sliceId: "M01-S01" };
}

describe("pre-op:guard", () => {
	beforeEach(() => {
		const { adapter } = seedAdapter();
		setAdapter(adapter);
		setGuardsDisabled(false);
		setProjectInitialized(true);
		setLockSkipped(false);
	});

	afterEach(() => {
		getAdapter()?.close();
	});

	it("allows operation when guards are disabled", async () => {
		setGuardsDisabled(true);
		const result = JSON.parse(
			await preOpGuardCmd(["--slice-id", "M01-S01", "--operation", "execute"]),
		);
		expect(result.ok).toBe(true);
		expect(result.data.blocked).toBe(false);
	});

	it("allows operation when project not initialized", async () => {
		setProjectInitialized(false);
		const result = JSON.parse(
			await preOpGuardCmd(["--slice-id", "M01-S01", "--operation", "execute"]),
		);
		expect(result.ok).toBe(true);
		expect(result.data.blocked).toBe(false);
	});

	it("fails for invalid operation", async () => {
		const result = JSON.parse(
			await preOpGuardCmd(["--slice-id", "M01-S01", "--operation", "invalid"]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("INVALID_ENUM_VALUE");
	});

	it("fails for invalid slice-id format", async () => {
		const result = JSON.parse(
			await preOpGuardCmd(["--slice-id", "invalid", "--operation", "execute"]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PATTERN_MISMATCH");
	});

	it("fails when missing required flags", async () => {
		const result = JSON.parse(await preOpGuardCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});

	it("fails when slice not found", async () => {
		const result = JSON.parse(
			await preOpGuardCmd(["--slice-id", "M99-S99", "--operation", "discuss"]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("SLICE_NOT_FOUND");
	});

	it("allows operation matching slice status", async () => {
		const result = JSON.parse(
			await preOpGuardCmd(["--slice-id", "M01-S01", "--operation", "discuss"]),
		);
		expect(result.ok).toBe(true);
		expect(result.data.blocked).toBe(false);
	});

	it("blocks operation mismatching slice status", async () => {
		const result = JSON.parse(
			await preOpGuardCmd(["--slice-id", "M01-S01", "--operation", "execute"]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PREREQUISITE_NOT_MET");
	});

	it("returns lock unavailable when sync lock is held", async () => {
		setLockSkipped(true);
		const result = JSON.parse(
			await preOpGuardCmd(["--slice-id", "M01-S01", "--operation", "discuss"]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("LOCK_UNAVAILABLE");
	});
});
