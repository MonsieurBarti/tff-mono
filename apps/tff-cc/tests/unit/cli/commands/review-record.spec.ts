import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockClosableStateStores } from "../helpers/mock-stores.js";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";
import { reviewRecordCmd } from "../../../../src/cli/commands/review-record.cmd.js";

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
	return { adapter, sliceId: "M01-S01" };
}

describe("review:record", () => {
	beforeEach(() => {
		const { adapter } = seedAdapter();
		setAdapter(adapter);
	});

	afterEach(() => {
		getAdapter()?.close();
	});

	it("records a review for valid slice", async () => {
		const result = JSON.parse(
			await reviewRecordCmd([
				"--slice-id",
				"M01-S01",
				"--agent",
				"reviewer",
				"--verdict",
				"approved",
				"--type",
				"code",
				"--commit-sha",
				"abc123",
			]),
		);
		expect(result.ok).toBe(true);
		expect(result.data).toBeNull();
	});

	it("records a changes_requested review", async () => {
		const result = JSON.parse(
			await reviewRecordCmd([
				"--slice-id",
				"M01-S01",
				"--agent",
				"reviewer",
				"--verdict",
				"changes_requested",
				"--type",
				"security",
				"--commit-sha",
				"def456",
			]),
		);
		expect(result.ok).toBe(true);
	});

	it("fails for invalid slice-id format", async () => {
		const result = JSON.parse(
			await reviewRecordCmd([
				"--slice-id",
				"invalid",
				"--agent",
				"reviewer",
				"--verdict",
				"approved",
				"--type",
				"code",
				"--commit-sha",
				"abc123",
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PATTERN_MISMATCH");
	});

	it("fails for invalid verdict enum", async () => {
		const result = JSON.parse(
			await reviewRecordCmd([
				"--slice-id",
				"M01-S01",
				"--agent",
				"reviewer",
				"--verdict",
				"rejected",
				"--type",
				"code",
				"--commit-sha",
				"abc123",
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("INVALID_ENUM_VALUE");
	});

	it("fails for invalid type enum", async () => {
		const result = JSON.parse(
			await reviewRecordCmd([
				"--slice-id",
				"M01-S01",
				"--agent",
				"reviewer",
				"--verdict",
				"approved",
				"--type",
				"design",
				"--commit-sha",
				"abc123",
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("INVALID_ENUM_VALUE");
	});

	it("fails when missing required flags", async () => {
		const result = JSON.parse(await reviewRecordCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
