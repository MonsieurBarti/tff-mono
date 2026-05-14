import { vi } from "vitest";
import { Ok } from "@tff/core";
import type { SliceStatus } from "@tff/core";
import type { ClosableStateStores } from "../../../../src/infrastructure/adapters/sqlite/create-state-stores.js";
import { SQLiteStateAdapter } from "../../../../src/infrastructure/adapters/sqlite/sqlite-state.adapter.js";

/**
 * Minimal no-op journal for mock state stores.
 */
export const nullJournal = {
	append: () => Ok(0 as number),
	readAll: () => Ok([] as never[]),
	readSince: () => Ok([] as never[]),
	count: () => Ok(0 as number),
};

/**
 * Build a mock ClosableStateStores backed by the given adapter.
 * Use inside a vi.mock factory after capturing the adapter via vi.hoisted.
 */
export function createMockClosableStateStores(adapter: SQLiteStateAdapter): ClosableStateStores {
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
		close: vi.fn(),
		checkpoint: vi.fn(),
	};
}

/**
 * Seed a fresh in-memory adapter with a default project, milestone M01,
 * and optionally a slice S01.
 */
export function seedAdapter(): SQLiteStateAdapter {
	const adapter = SQLiteStateAdapter.createInMemory();
	adapter.init();
	adapter.saveProject({ name: "Test Project" });
	adapter.createMilestone({ number: 1, name: "Milestone One" });
	return adapter;
}

/**
 * Seed adapter and return the first milestone id.
 */
export function seedAdapterWithMilestone(): { adapter: SQLiteStateAdapter; milestoneId: string } {
	const adapter = seedAdapter();
	const msR = adapter.listMilestones();
	if (!msR.ok || msR.data.length === 0) throw new Error("No milestones seeded");
	const milestoneId = msR.data[0].id;
	return { adapter, milestoneId };
}

/**
 * Seed adapter with milestone + slice and return both ids.
 */
export function seedAdapterWithSlice(sliceId = "M01-S01"): {
	adapter: SQLiteStateAdapter;
	milestoneId: string;
	sliceId: string;
} {
	const { adapter, milestoneId } = seedAdapterWithMilestone();
	adapter.createSlice({ milestoneId, number: 1, title: "Slice One", id: sliceId });
	return { adapter, milestoneId, sliceId };
}

/**
 * Set a slice status directly via the adapter's underlying db connection.
 * This bypasses domain transition guards and is intended ONLY for test setup.
 * Uses a typed interface rather than `as any` for type safety.
 */
export function setSliceStatus(
	adapter: SQLiteStateAdapter,
	sliceId: string,
	status: SliceStatus,
): void {
	type RawDb = { prepare(sql: string): { run(...args: unknown[]): void } };
	const raw = adapter as unknown as { db: RawDb };
	raw.db
		.prepare("UPDATE slice SET status = ?, updated_at = datetime('now') WHERE id = ?")
		.run(status, sliceId);
}

/**
 * Close all slices for a given milestone by setting their status to 'closed'.
 * This bypasses domain transition guards and is intended ONLY for test setup.
 */
export function closeAllSlicesForMilestone(adapter: SQLiteStateAdapter, milestoneId: string): void {
	type RawDb = { prepare(sql: string): { run(...args: unknown[]): void } };
	const raw = adapter as unknown as { db: RawDb };
	raw.db
		.prepare(
			"UPDATE slice SET status = 'closed', updated_at = datetime('now') WHERE milestone_id = ?",
		)
		.run(milestoneId);
}
