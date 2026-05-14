import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createMockClosableStateStores,
	seedAdapterWithSlice,
	setSliceStatus,
} from "../helpers/mock-stores.js";
import { sliceCloseCmd } from "../../../../src/cli/commands/slice-close.cmd.js";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

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

function prepareSliceForClose(adapter: SQLiteStateAdapter, sliceId: string) {
	setSliceStatus(adapter, sliceId, "shipping");
	adapter.recordReview({
		sliceId,
		reviewer: "code-reviewer",
		type: "code",
		verdict: "approved",
		commitSha: "abc123",
		createdAt: new Date().toISOString(),
	});
	adapter.recordReview({
		sliceId,
		reviewer: "sec-reviewer",
		type: "security",
		verdict: "approved",
		commitSha: "def456",
		createdAt: new Date().toISOString(),
	});
}

describe("slice:close", () => {
	beforeEach(() => {
		const { adapter } = seedAdapterWithSlice();
		setAdapter(adapter);
	});

	afterEach(() => {
		getAdapter()?.close();
	});

	it("closes a slice when all tasks are closed", async () => {
		const adapter = getAdapter()!;
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Task One" });
		adapter.closeTask("M01-S01-T01");
		prepareSliceForClose(adapter, "M01-S01");
		setAdapter(adapter);
		const result = JSON.parse(await sliceCloseCmd(["--slice-id", "M01-S01"]));
		expect(result.ok).toBe(true);
		expect(result.data.status).toBe("closed");
	});

	it("fails when tasks are still open", async () => {
		const adapter = getAdapter()!;
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Open Task" });
		setAdapter(adapter);
		const result = JSON.parse(await sliceCloseCmd(["--slice-id", "M01-S01"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PRECONDITION_VIOLATION");
		expect(result.error.context.preconditions[0]).toBe("all_tasks_closed");
	});

	it("includes reason in success response", async () => {
		const adapter = getAdapter()!;
		adapter.createTask({ sliceId: "M01-S01", number: 1, title: "Task One" });
		adapter.closeTask("M01-S01-T01");
		prepareSliceForClose(adapter, "M01-S01");
		setAdapter(adapter);
		const result = JSON.parse(
			await sliceCloseCmd(["--slice-id", "M01-S01", "--reason", "Completed"]),
		);
		expect(result.ok).toBe(true);
		expect(result.data.reason).toBe("Completed");
	});

	it("fails for invalid slice-id format", async () => {
		const result = JSON.parse(await sliceCloseCmd(["--slice-id", "invalid"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PATTERN_MISMATCH");
	});

	it("fails when slice not found", async () => {
		const result = JSON.parse(await sliceCloseCmd(["--slice-id", "M99-S99"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("NOT_FOUND");
	});

	it("fails when missing required flag", async () => {
		const result = JSON.parse(await sliceCloseCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
