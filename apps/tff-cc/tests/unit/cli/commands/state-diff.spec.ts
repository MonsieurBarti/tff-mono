import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockClosableStateStores } from "../helpers/mock-stores.js";
import { STATE_FILE } from "@tff/core";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { renderStateMd } from "../../../../src/application/sync/generate-state.js";
import { stateDiffCmd } from "../../../../src/cli/commands/state-diff.cmd.js";

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

const { getDiskContent, setDiskContent } = vi.hoisted(() => {
	let _content = "";
	return {
		getDiskContent: () => _content,
		setDiskContent: (v: string) => {
			_content = v;
		},
	};
});

vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs")>();
	return {
		...actual,
		existsSync: vi.fn((p: string) => {
			if (p.includes(STATE_FILE)) return getDiskContent() !== "";
			return actual.existsSync(p);
		}),
		readFileSync: vi.fn((p: string, ...args: any[]) => {
			if (p.includes(STATE_FILE)) return getDiskContent();
			return actual.readFileSync(p, ...args);
		}),
	};
});

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

describe("state:diff", () => {
	beforeEach(() => {
		const adapter = seedAdapter();
		setAdapter(adapter);
		setDiskContent("");
	});

	afterEach(() => {
		getAdapter()?.close();
	});

	it("reports in-sync when disk matches rendered state", async () => {
		const adapter = getAdapter()!;
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Task One" });
		setAdapter(adapter);
		const msR = adapter.listMilestones();
		if (!msR.ok || msR.data.length === 0) throw new Error("no milestone");
		const rendered = renderStateMd(
			{ milestoneId: msR.data[0].id },
			{ milestoneStore: adapter, sliceStore: adapter, taskStore: adapter },
		);
		if (!rendered.ok) throw new Error("render failed");
		setDiskContent(rendered.data);
		const result = JSON.parse(await stateDiffCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.inSync).toBe(true);
	});

	it("reports out-of-sync when disk differs from rendered state", async () => {
		const adapter = getAdapter()!;
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Task One" });
		setAdapter(adapter);
		setDiskContent("# Different State\n");
		const result = JSON.parse(await stateDiffCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.inSync).toBe(false);
		expect(result.data.diff).toBeDefined();
	});

	it("reports in-sync when no milestones and no disk state", async () => {
		getAdapter()?.close();
		const adapter = SQLiteStateAdapter.createInMemory();
		adapter.init();
		setAdapter(adapter);
		const result = JSON.parse(await stateDiffCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.inSync).toBe(true);
	});

	it("reports out-of-sync when no milestones but disk state exists", async () => {
		getAdapter()?.close();
		const adapter = SQLiteStateAdapter.createInMemory();
		adapter.init();
		setAdapter(adapter);
		setDiskContent("# orphaned state\n");
		const result = JSON.parse(await stateDiffCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.inSync).toBe(false);
		expect(result.data.diff).toBeDefined();
	});

	it("truncates diff when not --full", async () => {
		const adapter = getAdapter()!;
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Task One" });
		setAdapter(adapter);
		setDiskContent("# Different State\nline\n".repeat(300));
		const result = JSON.parse(await stateDiffCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.inSync).toBe(false);
		expect(result.data.diff).toContain("truncated");
	});

	it("returns full diff with --full", async () => {
		const adapter = getAdapter()!;
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Task One" });
		setAdapter(adapter);
		setDiskContent("# Different State\nline\n".repeat(300));
		const result = JSON.parse(await stateDiffCmd(["--full"]));
		expect(result.ok).toBe(true);
		expect(result.data.inSync).toBe(false);
		expect(result.data.diff).not.toContain("truncated");
	});
});
