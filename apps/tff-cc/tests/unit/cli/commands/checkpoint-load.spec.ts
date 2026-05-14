import { beforeEach, describe, expect, it, vi } from "vitest";
import { Ok } from "@tff/core";
import type { ClosableStateStores } from "../../../../src/infrastructure/adapters/sqlite/create-state-stores.js";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { checkpointLoadCmd } from "../../../../src/cli/commands/checkpoint-load.cmd.js";

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

vi.mock("../../../../src/infrastructure/adapters/filesystem/markdown-artifact.adapter.js", () => ({
	MarkdownArtifactAdapter: class {
		async read(path: string) {
			if (path.includes("M01-S01")) {
				return Ok(
					'<!-- checkpoint-json: {"baseCommit":"abc123","currentWave":1,"completedWaves":[0],"completedTasks":[],"executorLog":[]} -->',
				);
			}
			return { ok: false, error: { code: "NOT_FOUND", message: "File not found", meta: { path } } };
		}
	},
}));

function seedAdapter(): { adapter: SQLiteStateAdapter; sliceId: string } {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	adapter.saveProject({ name: "Test Project" });
	adapter.createMilestone({ number: 1, name: "Milestone One" });
	const msR = adapter.listMilestones();
	if (!msR.ok || msR.data.length === 0) throw new Error("No milestones seeded");
	const milestoneId = msR.data[0].id;
	adapter.createSlice({ milestoneId, number: 1, title: "Slice One" });
	return { adapter, sliceId: "M01-S01" };
}

describe("checkpoint:load", () => {
	beforeEach(() => {
		const { adapter } = seedAdapter();
		setAdapter(adapter);
	});

	it("loads checkpoint for valid slice-id", async () => {
		const { sliceId } = seedAdapter();
		setAdapter(seedAdapter().adapter);
		const result = JSON.parse(await checkpointLoadCmd(["--slice-id", sliceId]));
		expect(result.ok).toBe(true);
		expect(result.data.baseCommit).toBe("abc123");
	});

	it("fails when checkpoint is missing", async () => {
		const { adapter } = seedAdapter();
		adapter.createSlice({
			milestoneId: adapter.listMilestones().data![0].id,
			number: 2,
			title: "Slice Two",
		});
		setAdapter(adapter);
		const result = JSON.parse(await checkpointLoadCmd(["--slice-id", "M01-S02"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("NOT_FOUND");
	});

	it("fails for invalid slice-id format", async () => {
		const result = JSON.parse(await checkpointLoadCmd(["--slice-id", "invalid"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PATTERN_MISMATCH");
	});

	it("fails when missing required flag", async () => {
		const result = JSON.parse(await checkpointLoadCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
