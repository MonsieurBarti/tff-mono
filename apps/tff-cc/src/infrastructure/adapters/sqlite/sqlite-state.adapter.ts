import { copyFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type Database from "better-sqlite3";
import {
	AlreadyClaimedError,
	BaseDomainError,
	Err,
	Ok,
	PreconditionViolationError,
	Slice,
	SliceNotFoundError,
	milestoneBranchName,
	runMigrations,
} from "@tff/core";
import { GenericDomainError, type DomainError } from "../../errors/generic-domain-error.js";
import type {
	DomainEvent,
	Milestone,
	MilestoneProps,
	MilestoneStore,
	MilestoneUpdateProps,
	Project,
	ProjectProps,
	ProjectStore,
	Result,
	ReviewState,
	SliceProps,
	SliceState,
	SliceStatus,
	SliceStore,
	SliceUpdateProps,
	Task,
	TaskProps,
	TaskStore,
	TaskUpdateProps,
} from "@tff/core";
import type { DatabaseInit } from "../../../domain/ports/database-init.port.js";
import type { DependencyStore } from "../../../domain/ports/dependency-store.port.js";
import type {
	AuditVerdict,
	MilestoneAuditRecord,
	MilestoneAuditStore,
} from "../../../domain/ports/milestone-audit-store.port.js";
import type {
	PendingJudgmentRecord,
	PendingJudgmentStore,
} from "../../../domain/ports/pending-judgment-store.port.js";
import type { ReviewStore } from "../../../domain/ports/review-store.port.js";
import type { SessionStore } from "../../../domain/ports/session-store.port.js";
import type {
	SliceDependency,
	SliceDependencyStore,
} from "../../../domain/ports/slice-dependency-store.port.js";
import type { TransactionRunner } from "../../../domain/ports/transaction-runner.port.js";
import type { Dependency } from "../../../shared/value-objects/dependency.js";
import type { ReviewRecord, ReviewType } from "../../../shared/value-objects/review-record.js";
import type { WorkflowSession } from "../../../shared/value-objects/workflow-session.js";
import { getProjectHome, getProjectId } from "../../home-directory.js";
import { openDatabase } from "./open-database.js";

interface SliceRow {
	id: string;
	milestone_id: string | null;
	kind: string;
	number: number;
	title: string;
	status: string;
	tier: string | null;
	base_branch: string | null;
	branch_name: string | null;
	created_at: string;
	updated_at: string;
	archived_at: string | null;
}

interface MilestoneRow {
	id: string;
	project_id: string;
	number: number;
	name: string;
	status: string;
	branch: string;
	close_reason: string | null;
	created_at: string;
	updated_at: string;
	archived_at: string | null;
}

interface TaskRow {
	id: string;
	slice_id: string;
	number: number;
	title: string;
	description: string | null;
	status: string;
	wave: number | null;
	difficulty: number | null;
	claimed_at: string | null;
	claimed_by: string | null;
	closed_reason: string | null;
	created_at: string;
	updated_at: string;
}

export class SQLiteStateAdapter
	implements
		DatabaseInit,
		TransactionRunner,
		ProjectStore,
		MilestoneStore,
		SliceStore,
		TaskStore,
		DependencyStore,
		SliceDependencyStore,
		SessionStore,
		ReviewStore,
		MilestoneAuditStore,
		PendingJudgmentStore
{
	constructor(
		private db: Database.Database,
		private dbPath: string,
		private migrationsDir?: string,
	) {}

	/**
	 * Create adapter with path derived from home directory.
	 * Uses .tff-project-id in current working directory to determine project ID.
	 */
	static create(): SQLiteStateAdapter {
		const projectId = getProjectId(process.cwd());
		const home = getProjectHome(projectId);
		const dbPath = join(home, "state.db");
		return SQLiteStateAdapter.createWithPath(dbPath);
	}

	/**
	 * Create adapter with explicit path (backward compatibility).
	 * Used by tests and migrations.
	 */
	static createWithPath(dbPath: string, migrationsDir?: string): SQLiteStateAdapter {
		const db = openDatabase(dbPath);
		return new SQLiteStateAdapter(db, dbPath, migrationsDir);
	}

	static createInMemory(migrationsDir?: string): SQLiteStateAdapter {
		const db = openDatabase(":memory:");
		return new SQLiteStateAdapter(db, ":memory:", migrationsDir);
	}

	private writeFailure(message: string): PreconditionViolationError {
		return new PreconditionViolationError(message, ["WRITE_FAILURE"]);
	}

	// DatabaseInit
	init(): Result<void, DomainError> {
		try {
			runMigrations(this.db, this.migrationsDir);
			return Ok(undefined);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			if (msg.includes("VERSION_MISMATCH")) {
				if (!this.dbPath || this.dbPath === ":memory:") {
					const dbVer = Number(msg.match(/version (\d+)/)?.[1] ?? 0);
					const codeVer = Number(msg.match(/code version (\d+)/)?.[1] ?? 0);
					return Err(
						new GenericDomainError(
							"VERSION_MISMATCH",
							`Database schema version ${dbVer} is newer than code version ${codeVer}. Upgrade tff-tools.`,
						),
					);
				}
				console.warn(
					`[tff] Database schema version mismatch at ${this.dbPath}; backing up and recreating.`,
				);
				try {
					const backupPath = `${this.dbPath}.backup.${Date.now()}`;
					copyFileSync(this.dbPath, backupPath);
					console.warn(`[tff] Backup saved to ${backupPath}`);
					this.db.close();
					unlinkSync(this.dbPath);
					for (const suffix of ["-wal", "-shm"]) {
						const companion = `${this.dbPath}${suffix}`;
						if (existsSync(companion)) unlinkSync(companion);
					}
					this.db = openDatabase(this.dbPath);
					runMigrations(this.db, this.migrationsDir);
					return Ok(undefined);
				} catch (recoveryErr) {
					const recoveryMsg =
						recoveryErr instanceof Error ? recoveryErr.message : String(recoveryErr);
					return Err(this.writeFailure(`Schema wipe/recreate failed: ${recoveryMsg}`));
				}
			}
			return Err(this.writeFailure(`Migration failed: ${msg}`));
		}
	}

	transaction<T>(fn: () => T): T {
		return this.db.transaction(fn)();
	}

	close(): void {
		this.db.close();
	}

	checkpoint(): void {
		this.db.pragma("wal_checkpoint(PASSIVE)");
	}

	// ProjectStore
	getProject(): Result<Project | null, DomainError> {
		try {
			const row = this.db
				.prepare(
					"SELECT id, name, vision, created_at, updated_at FROM project WHERE id = 'singleton'",
				)
				.get() as
				| {
						id: string;
						name: string;
						vision: string | null;
						created_at: string;
						updated_at: string;
				  }
				| undefined;
			if (!row) return Ok(null);
			return Ok({
				id: row.id,
				name: row.name,
				vision: row.vision ?? "",
				createdAt: new Date(row.created_at),
				updatedAt: new Date(row.updated_at),
			} as unknown as Project);
		} catch (e) {
			return Err(this.writeFailure(`Failed to get project: ${e}`));
		}
	}

	saveProject(props: ProjectProps): Result<Project, DomainError> {
		try {
			const now = new Date().toISOString();
			this.db
				.prepare(
					`INSERT INTO project (id, name, vision, created_at, updated_at)
           VALUES ('singleton', ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, vision = excluded.vision, updated_at = excluded.updated_at`,
				)
				.run(props.name, props.vision ?? null, now, now);
			return Ok({
				id: "singleton",
				name: props.name,
				vision: props.vision ?? "",
				createdAt: new Date(now),
				updatedAt: new Date(now),
			} as unknown as Project);
		} catch (e) {
			return Err(this.writeFailure(`Failed to save project: ${e}`));
		}
	}

	// MilestoneStore
	createMilestone(props: MilestoneProps): Result<Milestone, DomainError> {
		try {
			const id = props.id ?? crypto.randomUUID();
			const branch = props.branch ?? milestoneBranchName(id);
			const now = new Date().toISOString();
			this.db
				.prepare(
					`INSERT INTO milestone (id, project_id, number, name, status, branch, created_at, updated_at)
           VALUES (?, 'singleton', ?, ?, 'open', ?, ?, ?)`,
				)
				.run(id, props.number, props.name, branch, now, now);
			return Ok({
				id,
				projectId: "singleton",
				number: props.number,
				name: props.name,
				status: "open" as const,
				branch,
				closeReason: null,
				createdAt: new Date(now),
				updatedAt: new Date(now),
				archivedAt: null,
			} as unknown as Milestone);
		} catch (e) {
			return Err(this.writeFailure(`Failed to create milestone: ${e}`));
		}
	}

	getMilestone(id: string): Result<Milestone | null, DomainError> {
		try {
			const row = this.db.prepare("SELECT * FROM milestone WHERE id = ?").get(id) as
				| MilestoneRow
				| undefined;
			if (!row) return Ok(null);
			return Ok(this.rowToMilestone(row));
		} catch (e) {
			return Err(this.writeFailure(`Failed to get milestone: ${e}`));
		}
	}

	getMilestoneByNumber(number: number): Result<Milestone | null, DomainError> {
		try {
			const row = this.db
				.prepare(
					"SELECT * FROM milestone WHERE number = ? AND archived_at IS NULL ORDER BY created_at DESC LIMIT 1",
				)
				.get(number) as MilestoneRow | undefined;
			if (!row) return Ok(null);
			return Ok(this.rowToMilestone(row));
		} catch (e) {
			return Err(this.writeFailure(`Failed to get milestone by number: ${e}`));
		}
	}

	listMilestones(options?: { includeArchived?: boolean }): Result<Milestone[], DomainError> {
		try {
			const includeArchived = options?.includeArchived === true;
			const sql = includeArchived
				? "SELECT * FROM milestone ORDER BY number"
				: "SELECT * FROM milestone WHERE archived_at IS NULL ORDER BY number";
			const rows = this.db.prepare(sql).all() as Array<MilestoneRow>;
			return Ok(rows.map((r) => this.rowToMilestone(r)));
		} catch (e) {
			return Err(this.writeFailure(`Failed to list milestones: ${e}`));
		}
	}

	updateMilestone(id: string, updates: MilestoneUpdateProps): Result<void, DomainError> {
		try {
			const sets: string[] = [];
			const values: unknown[] = [];
			if (updates.name !== undefined) {
				sets.push("name = ?");
				values.push(updates.name);
			}
			if (updates.status !== undefined) {
				sets.push("status = ?");
				values.push(updates.status);
			}
			if (sets.length === 0) return Ok(undefined);
			sets.push("updated_at = datetime('now')");
			values.push(id);
			this.db.prepare(`UPDATE milestone SET ${sets.join(", ")} WHERE id = ?`).run(...values);
			return Ok(undefined);
		} catch (e) {
			return Err(this.writeFailure(`Failed to update milestone: ${e}`));
		}
	}

	archiveMilestoneCascade(id: string): Result<{ slicesArchived: number }, DomainError> {
		return this.db.transaction((): Result<{ slicesArchived: number }, DomainError> => {
			try {
				const sliceInfo = this.db
					.prepare(
						"UPDATE slice SET archived_at = datetime('now'), updated_at = datetime('now') WHERE milestone_id = ? AND archived_at IS NULL",
					)
					.run(id);
				this.db
					.prepare(
						"UPDATE milestone SET archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND archived_at IS NULL",
					)
					.run(id);
				return Ok({ slicesArchived: sliceInfo.changes });
			} catch (e) {
				return Err(this.writeFailure(`Failed to archive milestone cascade: ${e}`));
			}
		})();
	}

	closeMilestone(id: string, reason?: string): Result<void, DomainError> {
		return this.db.transaction((): Result<void, DomainError> => {
			try {
				const slicesResult = this.listSlices(id);
				if (!slicesResult.ok) return slicesResult;
				const missing: string[] = [];
				for (const slice of slicesResult.data) {
					const reviewsResult = this.listReviews(slice.id);
					if (!reviewsResult.ok) return reviewsResult;
					const hasApprovedSpec = reviewsResult.data.some(
						(r) => r.type === "spec" && r.verdict === "approved",
					);
					if (!hasApprovedSpec) missing.push(slice.id);
				}
				if (missing.length > 0) {
					return Err(
						new GenericDomainError(
							"MILESTONE_COMPLETENESS_VIOLATION",
							`Milestone "${id}" cannot close — slices missing approved spec review: ${missing.join(", ")}`,
							{ milestoneId: id, missing },
						),
					);
				}
				const openSlices = this.db
					.prepare(
						"SELECT COUNT(*) as count FROM slice WHERE milestone_id = ? AND status != 'closed'",
					)
					.get(id) as { count: number };
				if (openSlices.count > 0) {
					return Err(
						new PreconditionViolationError(
							`Cannot close "${id}" — ${String(openSlices.count)} children are still open`,
							["HAS_OPEN_CHILDREN"],
						),
					);
				}
				this.db
					.prepare(
						"UPDATE milestone SET status = 'closed', close_reason = ?, updated_at = datetime('now') WHERE id = ?",
					)
					.run(reason ?? null, id);
				return Ok(undefined);
			} catch (e) {
				return Err(this.writeFailure(`Failed to close milestone: ${e}`));
			}
		})();
	}

	// SliceStore
	createSlice(props: SliceProps): Result<Slice, DomainError> {
		try {
			const id = props.id ?? crypto.randomUUID();
			const kind = props.kind ?? "milestone";
			const now = new Date().toISOString();
			this.db
				.prepare(
					`INSERT INTO slice (id, milestone_id, kind, number, title, status, tier, base_branch, branch_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'discussing', ?, ?, ?, ?, ?)`,
				)
				.run(
					id,
					props.milestoneId ?? null,
					kind,
					props.number,
					props.title,
					props.tier ?? null,
					props.baseBranch ?? null,
					props.branchName ?? null,
					now,
					now,
				);
			return Ok({
				id,
				milestoneId: props.milestoneId ?? null,
				kind,
				number: props.number,
				title: props.title,
				status: "discussing" as const,
				tier: props.tier ?? null,
				baseBranch: props.baseBranch ?? "",
				branchName: props.branchName ?? "",
				createdAt: new Date(now),
				updatedAt: new Date(now),
				archivedAt: null,
			} as unknown as Slice);
		} catch (e) {
			return Err(this.writeFailure(`Failed to create slice: ${e}`));
		}
	}

	getSlice(id: string): Result<Slice | null, DomainError> {
		try {
			const row = this.db.prepare("SELECT * FROM slice WHERE id = ?").get(id) as
				| SliceRow
				| undefined;
			if (!row) return Ok(null);
			return Ok(this.rowToSlice(row));
		} catch (e) {
			return Err(this.writeFailure(`Failed to get slice: ${e}`));
		}
	}

	getSliceByNumbers(
		milestoneNumber: number,
		sliceNumber: number,
	): Result<Slice | null, DomainError> {
		try {
			const row = this.db
				.prepare(
					`SELECT s.* FROM slice s
           JOIN milestone m ON s.milestone_id = m.id
           WHERE m.number = ? AND s.number = ?
             AND s.archived_at IS NULL AND m.archived_at IS NULL
           ORDER BY s.created_at DESC LIMIT 1`,
				)
				.get(milestoneNumber, sliceNumber) as SliceRow | undefined;
			if (!row) return Ok(null);
			return Ok(this.rowToSlice(row));
		} catch (e) {
			return Err(this.writeFailure(`Failed to get slice by numbers: ${e}`));
		}
	}

	listSlices(
		milestoneIdOrOptions?: string | { milestoneId?: string; includeArchived?: boolean },
	): Result<Slice[], DomainError> {
		try {
			const opts =
				typeof milestoneIdOrOptions === "string"
					? { milestoneId: milestoneIdOrOptions, includeArchived: false }
					: (milestoneIdOrOptions ?? {});
			const includeArchived = opts.includeArchived === true;
			const archivedClause = includeArchived ? "" : " AND archived_at IS NULL";
			const archivedClauseStandalone = includeArchived ? "" : " WHERE archived_at IS NULL";
			const rows = opts.milestoneId
				? (this.db
						.prepare(`SELECT * FROM slice WHERE milestone_id = ?${archivedClause} ORDER BY number`)
						.all(opts.milestoneId) as Array<SliceRow>)
				: (this.db
						.prepare(`SELECT * FROM slice${archivedClauseStandalone} ORDER BY milestone_id, number`)
						.all() as Array<SliceRow>);
			return Ok(rows.map((r) => this.rowToSlice(r)));
		} catch (e) {
			return Err(this.writeFailure(`Failed to list slices: ${e}`));
		}
	}

	listSlicesByKind(
		kind: Slice["kind"],
		options?: { includeArchived?: boolean },
	): Result<Slice[], DomainError> {
		try {
			const includeArchived = options?.includeArchived === true;
			const sql = includeArchived
				? "SELECT * FROM slice WHERE kind = ? ORDER BY number"
				: "SELECT * FROM slice WHERE kind = ? AND archived_at IS NULL ORDER BY number";
			const rows = this.db.prepare(sql).all(kind) as Array<SliceRow>;
			return Ok(rows.map((r) => this.rowToSlice(r)));
		} catch (e) {
			return Err(this.writeFailure(`Failed to list slices by kind: ${e}`));
		}
	}

	updateSlice(id: string, updates: SliceUpdateProps): Result<void, DomainError> {
		try {
			const sets: string[] = [];
			const values: unknown[] = [];
			if (updates.title !== undefined) {
				sets.push("title = ?");
				values.push(updates.title);
			}
			if (updates.tier !== undefined) {
				sets.push("tier = ?");
				values.push(updates.tier);
			}
			if (sets.length === 0) return Ok(undefined);
			sets.push("updated_at = datetime('now')");
			values.push(id);
			this.db.prepare(`UPDATE slice SET ${sets.join(", ")} WHERE id = ?`).run(...values);
			return Ok(undefined);
		} catch (e) {
			return Err(this.writeFailure(`Failed to update slice: ${e}`));
		}
	}

	transitionSlice(id: string, target: SliceStatus): Result<DomainEvent<unknown>[], DomainError> {
		return this.db.transaction((): Result<DomainEvent<unknown>[], DomainError> => {
			if (target === "closed") {
				const currentResult = this.getSlice(id);
				if (!currentResult.ok) return currentResult;
				if (currentResult.data?.status === "shipping") {
					const reviewsResult = this.listReviews(id);
					if (!reviewsResult.ok) return reviewsResult;
					const approvedTypes = new Set(
						reviewsResult.data.filter((r) => r.verdict === "approved").map((r) => r.type),
					);
					const missing: Array<"code" | "security"> = [];
					if (!approvedTypes.has("code")) missing.push("code");
					if (!approvedTypes.has("security")) missing.push("security");
					if (missing.length > 0) {
						return Err(
							new GenericDomainError(
								"SHIP_COMPLETENESS_VIOLATION",
								`Slice "${id}" cannot close — missing approved review(s) of type: ${missing.join(", ")}`,
								{ sliceId: id, missing },
							),
						);
					}
				}
			}
			try {
				const getResult = this.getSlice(id);
				if (!getResult.ok) return getResult;
				if (!getResult.data) {
					return Err(new SliceNotFoundError(`Slice "${id}" not found`, id));
				}
				// Load reviews for domain guards (e.g. verifying → reviewing)
				const reviewRows = this.db
					.prepare(
						"SELECT id, slice_id, type, reviewer, verdict, commit_sha, notes, created_at FROM review WHERE slice_id = ?",
					)
					.all(id) as Array<{
					id: number;
					slice_id: string;
					type: string;
					reviewer: string;
					verdict: string;
					commit_sha: string;
					notes: string | null;
					created_at: string;
				}>;
				const reviews: ReviewState[] = reviewRows.map((r) => ({
					id: r.id,
					sliceId: r.slice_id,
					type: r.type,
					reviewer: r.reviewer,
					verdict: r.verdict as ReviewState["verdict"],
					commitSha: r.commit_sha,
					notes: r.notes,
					createdAt: new Date(r.created_at),
				}));
				const slice = Slice.reconstruct({
					...(getResult.data as unknown as SliceState),
					reviews,
				});
				slice.transition(target);
				this.db
					.prepare("UPDATE slice SET status = ?, updated_at = datetime('now') WHERE id = ?")
					.run(target, id);
				if (target === "closed") {
					this.db
						.prepare(
							`INSERT INTO pending_judgments(slice_id) VALUES (?)
               ON CONFLICT(slice_id) DO NOTHING`,
						)
						.run(id);
				}
				return Ok(slice.pullEvents());
			} catch (e) {
				if (e instanceof BaseDomainError) {
					return Err(e);
				}
				return Err(this.writeFailure(`Failed to transition slice: ${e}`));
			}
		})();
	}

	archiveSlice(id: string): Result<void, DomainError> {
		try {
			this.db
				.prepare(
					"UPDATE slice SET archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND archived_at IS NULL",
				)
				.run(id);
			return Ok(undefined);
		} catch (e) {
			return Err(this.writeFailure(`Failed to archive slice: ${e}`));
		}
	}

	// TaskStore
	createTask(props: TaskProps): Result<Task, DomainError> {
		try {
			const id = `${props.sliceId}-T${props.number.toString().padStart(2, "0")}`;
			const now = new Date().toISOString();
			this.db
				.prepare(
					`INSERT INTO task (id, slice_id, number, title, description, status, wave, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
				)
				.run(
					id,
					props.sliceId,
					props.number,
					props.title,
					props.description ?? null,
					props.wave ?? null,
					now,
					now,
				);
			return Ok({
				id,
				sliceId: props.sliceId,
				number: props.number,
				title: props.title,
				description: props.description ?? "",
				status: "open" as const,
				wave: props.wave ?? null,
				difficulty: null,
				claimedAt: null,
				claimedBy: null,
				closedReason: null,
				createdAt: new Date(now),
				updatedAt: new Date(now),
			} as unknown as Task);
		} catch (e) {
			return Err(this.writeFailure(`Failed to create task: ${e}`));
		}
	}

	getTask(id: string): Result<Task | null, DomainError> {
		try {
			const row = this.db.prepare("SELECT * FROM task WHERE id = ?").get(id) as TaskRow | undefined;
			if (!row) return Ok(null);
			return Ok(this.rowToTask(row));
		} catch (e) {
			return Err(this.writeFailure(`Failed to get task: ${e}`));
		}
	}

	listTasks(sliceId: string): Result<Task[], DomainError> {
		try {
			const rows = this.db
				.prepare("SELECT * FROM task WHERE slice_id = ? ORDER BY number")
				.all(sliceId) as Array<TaskRow>;
			return Ok(rows.map((r) => this.rowToTask(r)));
		} catch (e) {
			return Err(this.writeFailure(`Failed to list tasks: ${e}`));
		}
	}

	updateTask(id: string, updates: TaskUpdateProps): Result<void, DomainError> {
		try {
			const sets: string[] = [];
			const values: unknown[] = [];
			if (updates.title !== undefined) {
				sets.push("title = ?");
				values.push(updates.title);
			}
			if (updates.description !== undefined) {
				sets.push("description = ?");
				values.push(updates.description);
			}
			if (updates.wave !== undefined) {
				sets.push("wave = ?");
				values.push(updates.wave);
			}
			if (sets.length === 0) return Ok(undefined);
			sets.push("updated_at = datetime('now')");
			values.push(id);
			this.db.prepare(`UPDATE task SET ${sets.join(", ")} WHERE id = ?`).run(...values);
			return Ok(undefined);
		} catch (e) {
			return Err(this.writeFailure(`Failed to update task: ${e}`));
		}
	}

	claimTask(id: string, claimedBy?: string): Result<void, DomainError> {
		try {
			const info =
				claimedBy !== undefined
					? this.db
							.prepare(
								"UPDATE task SET status = 'in_progress', claimed_at = datetime('now'), claimed_by = ?, updated_at = datetime('now') WHERE id = ? AND status = 'open'",
							)
							.run(claimedBy, id)
					: this.db
							.prepare(
								"UPDATE task SET status = 'in_progress', claimed_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND status = 'open'",
							)
							.run(id);
			if (info.changes === 0) {
				return Err(
					new AlreadyClaimedError(`Task "${id}" is already claimed`, id, claimedBy ?? "unknown"),
				);
			}
			return Ok(undefined);
		} catch (e) {
			return Err(this.writeFailure(`Failed to claim task: ${e}`));
		}
	}

	closeTask(id: string, reason?: string): Result<void, DomainError> {
		try {
			this.db
				.prepare(
					"UPDATE task SET status = 'closed', closed_reason = ?, updated_at = datetime('now') WHERE id = ?",
				)
				.run(reason ?? null, id);
			return Ok(undefined);
		} catch (e) {
			return Err(this.writeFailure(`Failed to close task: ${e}`));
		}
	}

	listReadyTasks(sliceId: string): Result<Task[], DomainError> {
		try {
			const rows = this.db
				.prepare(
					`SELECT * FROM task
           WHERE slice_id = ? AND status = 'open'
           AND NOT EXISTS (
             SELECT 1 FROM dependency d
             JOIN task blocker ON d.to_id = blocker.id
             WHERE d.from_id = task.id AND blocker.status != 'closed'
           )
           ORDER BY number`,
				)
				.all(sliceId) as Array<TaskRow>;
			return Ok(rows.map((r) => this.rowToTask(r)));
		} catch (e) {
			return Err(this.writeFailure(`Failed to list ready tasks: ${e}`));
		}
	}

	listStaleClaims(ttlMinutes: number): Result<Task[], DomainError> {
		try {
			const rows = this.db
				.prepare(
					`SELECT * FROM task
           WHERE status = 'in_progress'
           AND claimed_at < datetime('now', (-1 * ?) || ' minutes')
           ORDER BY claimed_at`,
				)
				.all(ttlMinutes) as Array<TaskRow>;
			return Ok(rows.map((r) => this.rowToTask(r)));
		} catch (e) {
			return Err(this.writeFailure(`Failed to list stale claims: ${e}`));
		}
	}

	getExecutorsForSlice(sliceId: string): Result<string[], DomainError> {
		try {
			const rows = this.db
				.prepare(
					"SELECT DISTINCT claimed_by FROM task WHERE slice_id = ? AND claimed_by IS NOT NULL",
				)
				.all(sliceId) as Array<{ claimed_by: string }>;
			return Ok(rows.map((r) => r.claimed_by));
		} catch (e) {
			return Err(this.writeFailure(`Failed to get executors for slice: ${e}`));
		}
	}

	// DependencyStore
	addDependency(fromId: string, toId: string, type: "blocks"): Result<void, DomainError> {
		try {
			this.db
				.prepare("INSERT OR REPLACE INTO dependency (from_id, to_id, type) VALUES (?, ?, ?)")
				.run(fromId, toId, type);
			return Ok(undefined);
		} catch (e) {
			return Err(this.writeFailure(`Failed to add dependency: ${e}`));
		}
	}

	removeDependency(fromId: string, toId: string): Result<void, DomainError> {
		try {
			this.db.prepare("DELETE FROM dependency WHERE from_id = ? AND to_id = ?").run(fromId, toId);
			return Ok(undefined);
		} catch (e) {
			return Err(this.writeFailure(`Failed to remove dependency: ${e}`));
		}
	}

	getDependencies(taskId: string): Result<Dependency[], DomainError> {
		try {
			const rows = this.db
				.prepare("SELECT from_id, to_id, type FROM dependency WHERE from_id = ? OR to_id = ?")
				.all(taskId, taskId) as Array<{ from_id: string; to_id: string; type: string }>;
			return Ok(rows.map((r) => ({ fromId: r.from_id, toId: r.to_id, type: r.type as "blocks" })));
		} catch (e) {
			return Err(this.writeFailure(`Failed to get dependencies: ${e}`));
		}
	}

	// SliceDependencyStore
	addSliceDependency(fromId: string, toId: string): Result<void, DomainError> {
		try {
			this.db
				.prepare("INSERT OR REPLACE INTO slice_dependency (from_id, to_id) VALUES (?, ?)")
				.run(fromId, toId);
			return Ok(undefined);
		} catch (e) {
			return Err(this.writeFailure(`Failed to add slice dependency: ${e}`));
		}
	}

	removeSliceDependency(fromId: string, toId: string): Result<void, DomainError> {
		try {
			this.db
				.prepare("DELETE FROM slice_dependency WHERE from_id = ? AND to_id = ?")
				.run(fromId, toId);
			return Ok(undefined);
		} catch (e) {
			return Err(this.writeFailure(`Failed to remove slice dependency: ${e}`));
		}
	}

	getSliceDependencies(sliceId: string): Result<SliceDependency[], DomainError> {
		try {
			const rows = this.db
				.prepare("SELECT from_id, to_id FROM slice_dependency WHERE from_id = ? OR to_id = ?")
				.all(sliceId, sliceId) as Array<{ from_id: string; to_id: string }>;
			return Ok(rows.map((r) => ({ fromId: r.from_id, toId: r.to_id })));
		} catch (e) {
			return Err(this.writeFailure(`Failed to get slice dependencies: ${e}`));
		}
	}

	// SessionStore
	getSession(): Result<WorkflowSession | null, DomainError> {
		try {
			const row = this.db.prepare("SELECT * FROM workflow_session WHERE id = 1").get() as
				| {
						phase: string;
						active_slice_id: string | null;
						active_milestone_id: string | null;
						paused_at: string | null;
						context_json: string | null;
				  }
				| undefined;
			if (!row) return Ok(null);
			return Ok({
				phase: row.phase,
				activeSliceId: row.active_slice_id ?? undefined,
				activeMilestoneId: row.active_milestone_id ?? undefined,
				pausedAt: row.paused_at ?? undefined,
				contextJson: row.context_json ?? undefined,
			});
		} catch (e) {
			return Err(this.writeFailure(`Failed to get session: ${e}`));
		}
	}

	saveSession(session: WorkflowSession): Result<void, DomainError> {
		try {
			this.db.pragma("foreign_keys = OFF");
			try {
				this.db
					.prepare(
						`INSERT INTO workflow_session (id, phase, active_slice_id, active_milestone_id, paused_at, context_json, updated_at)
             VALUES (1, ?, ?, ?, ?, ?, datetime('now'))
             ON CONFLICT(id) DO UPDATE SET phase = excluded.phase, active_slice_id = excluded.active_slice_id,
             active_milestone_id = excluded.active_milestone_id, paused_at = excluded.paused_at,
             context_json = excluded.context_json, updated_at = datetime('now')`,
					)
					.run(
						session.phase,
						session.activeSliceId ?? null,
						session.activeMilestoneId ?? null,
						session.pausedAt ?? null,
						session.contextJson ?? null,
					);
			} finally {
				this.db.pragma("foreign_keys = ON");
			}
			return Ok(undefined);
		} catch (e) {
			return Err(this.writeFailure(`Failed to save session: ${e}`));
		}
	}

	// ReviewStore
	recordReview(review: ReviewRecord): Result<void, DomainError> {
		return this.db.transaction((): Result<void, DomainError> => {
			const executorsResult = this.getExecutorsForSlice(review.sliceId);
			if (!executorsResult.ok) return executorsResult;
			if (executorsResult.data.includes(review.reviewer)) {
				return Err(
					new GenericDomainError(
						"FRESH_REVIEWER_VIOLATION",
						`Agent "${review.reviewer}" cannot review slice "${review.sliceId}" — was the executor`,
						{ sliceId: review.sliceId, reviewer: review.reviewer },
					),
				);
			}
			try {
				this.db
					.prepare(
						`INSERT INTO review (slice_id, type, reviewer, verdict, commit_sha, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
					)
					.run(
						review.sliceId,
						review.type,
						review.reviewer,
						review.verdict,
						review.commitSha,
						review.notes ?? null,
						review.createdAt,
					);
				return Ok(undefined);
			} catch (e) {
				return Err(this.writeFailure(`Failed to record review: ${e}`));
			}
		})();
	}

	getLatestReview(sliceId: string, type: ReviewType): Result<ReviewRecord | null, DomainError> {
		try {
			const row = this.db
				.prepare(
					"SELECT * FROM review WHERE slice_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1",
				)
				.get(sliceId, type) as
				| {
						slice_id: string;
						type: string;
						reviewer: string;
						verdict: string;
						commit_sha: string;
						notes: string | null;
						created_at: string;
				  }
				| undefined;
			if (!row) return Ok(null);
			return Ok(this.rowToReview(row));
		} catch (e) {
			return Err(this.writeFailure(`Failed to get latest review: ${e}`));
		}
	}

	listReviews(sliceId: string): Result<ReviewRecord[], DomainError> {
		try {
			const rows = this.db
				.prepare("SELECT * FROM review WHERE slice_id = ? ORDER BY created_at")
				.all(sliceId) as Array<{
				slice_id: string;
				type: string;
				reviewer: string;
				verdict: string;
				commit_sha: string;
				notes: string | null;
				created_at: string;
			}>;
			return Ok(rows.map((r) => this.rowToReview(r)));
		} catch (e) {
			return Err(this.writeFailure(`Failed to list reviews: ${e}`));
		}
	}

	// MilestoneAuditStore
	upsertAudit(r: MilestoneAuditRecord): Result<void, DomainError> {
		try {
			this.db
				.prepare(
					`INSERT INTO milestone_audit(milestone_id, verdict, audited_at, notes)
					 VALUES (?, ?, ?, ?)
					 ON CONFLICT(milestone_id) DO UPDATE SET
					   verdict = excluded.verdict,
					   audited_at = excluded.audited_at,
					   notes = excluded.notes`,
				)
				.run(r.milestoneId, r.verdict, r.auditedAt, r.notes ?? null);
			return Ok(undefined);
		} catch (e) {
			return Err(this.writeFailure(`Failed to upsert audit: ${e}`));
		}
	}

	// PendingJudgmentStore
	insertPending(sliceId: string): Result<void, DomainError> {
		try {
			this.db
				.prepare(
					`INSERT INTO pending_judgments(slice_id) VALUES (?)
           ON CONFLICT(slice_id) DO NOTHING`,
				)
				.run(sliceId);
			return Ok(undefined);
		} catch (e) {
			return Err(this.writeFailure(`Failed to insert pending judgment: ${e}`));
		}
	}

	clearPending(sliceId: string): Result<void, DomainError> {
		try {
			this.db.prepare("DELETE FROM pending_judgments WHERE slice_id = ?").run(sliceId);
			return Ok(undefined);
		} catch (e) {
			return Err(this.writeFailure(`Failed to clear pending judgment: ${e}`));
		}
	}

	listPending(): Result<PendingJudgmentRecord[], DomainError> {
		try {
			const rows = this.db
				.prepare(
					`SELECT slice_id as sliceId, created_at as createdAt,
                  merge_sha as mergeSha, base_ref as baseRef
           FROM pending_judgments ORDER BY created_at ASC`,
				)
				.all() as Array<{
				sliceId: string;
				createdAt: string;
				mergeSha: string | null;
				baseRef: string | null;
			}>;
			return Ok(
				rows.map((r) => ({
					sliceId: r.sliceId,
					createdAt: r.createdAt,
					...(r.mergeSha != null ? { mergeSha: r.mergeSha } : {}),
					...(r.baseRef != null ? { baseRef: r.baseRef } : {}),
				})),
			);
		} catch (e) {
			return Err(this.writeFailure(`Failed to list pending judgments: ${e}`));
		}
	}

	listPendingForMilestone(milestoneId: string): Result<PendingJudgmentRecord[], DomainError> {
		try {
			const rows = this.db
				.prepare(
					`SELECT pj.slice_id as sliceId, pj.created_at as createdAt,
                  pj.merge_sha as mergeSha, pj.base_ref as baseRef
           FROM pending_judgments pj
           JOIN slice s ON s.id = pj.slice_id
           WHERE s.milestone_id = ?
           ORDER BY pj.created_at ASC`,
				)
				.all(milestoneId) as Array<{
				sliceId: string;
				createdAt: string;
				mergeSha: string | null;
				baseRef: string | null;
			}>;
			return Ok(
				rows.map((r) => ({
					sliceId: r.sliceId,
					createdAt: r.createdAt,
					...(r.mergeSha != null ? { mergeSha: r.mergeSha } : {}),
					...(r.baseRef != null ? { baseRef: r.baseRef } : {}),
				})),
			);
		} catch (e) {
			return Err(this.writeFailure(`Failed to list pending judgments for milestone: ${e}`));
		}
	}

	getPending(sliceId: string): Result<PendingJudgmentRecord | null, DomainError> {
		try {
			const row = this.db
				.prepare(
					`SELECT slice_id as sliceId, created_at as createdAt,
                  merge_sha as mergeSha, base_ref as baseRef
           FROM pending_judgments WHERE slice_id = ?`,
				)
				.get(sliceId) as
				| {
						sliceId: string;
						createdAt: string;
						mergeSha: string | null;
						baseRef: string | null;
				  }
				| undefined;
			if (!row) return Ok(null);
			return Ok({
				sliceId: row.sliceId,
				createdAt: row.createdAt,
				...(row.mergeSha != null ? { mergeSha: row.mergeSha } : {}),
				...(row.baseRef != null ? { baseRef: row.baseRef } : {}),
			});
		} catch (e) {
			return Err(this.writeFailure(`Failed to get pending judgment: ${e}`));
		}
	}

	recordMerge(sliceId: string, mergeSha: string, baseRef: string): Result<void, DomainError> {
		try {
			this.db
				.prepare(
					`INSERT INTO pending_judgments(slice_id, merge_sha, base_ref) VALUES (?, ?, ?)
           ON CONFLICT(slice_id) DO UPDATE SET
             merge_sha = excluded.merge_sha,
             base_ref = excluded.base_ref`,
				)
				.run(sliceId, mergeSha, baseRef);
			return Ok(undefined);
		} catch (e) {
			return Err(this.writeFailure(`Failed to record merge context: ${e}`));
		}
	}

	getAudit(milestoneId: string): Result<MilestoneAuditRecord | null, DomainError> {
		try {
			const row = this.db
				.prepare(
					`SELECT milestone_id as milestoneId, verdict, audited_at as auditedAt, notes
           FROM milestone_audit WHERE milestone_id = ?`,
				)
				.get(milestoneId) as
				| { milestoneId: string; verdict: string; auditedAt: string; notes: string | null }
				| undefined;
			if (!row) return Ok(null);
			return Ok({
				milestoneId: row.milestoneId,
				verdict: row.verdict as AuditVerdict,
				auditedAt: row.auditedAt,
				notes: row.notes ?? undefined,
			});
		} catch (e) {
			return Err(this.writeFailure(`Failed to load audit: ${e}`));
		}
	}

	// Helpers
	private rowToSlice(row: SliceRow): Slice {
		return {
			id: row.id,
			milestoneId: row.milestone_id ?? null,
			kind: row.kind as Slice["kind"],
			number: row.number,
			title: row.title,
			status: row.status as Slice["status"],
			tier: row.tier ?? null,
			baseBranch: row.base_branch ?? "",
			branchName: row.branch_name ?? "",
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
			archivedAt: row.archived_at ? new Date(row.archived_at) : null,
		} as unknown as Slice;
	}

	private rowToTask(row: TaskRow): Task {
		return {
			id: row.id,
			sliceId: row.slice_id,
			number: row.number,
			title: row.title,
			description: row.description ?? "",
			status: row.status as Task["status"],
			wave: row.wave ?? null,
			difficulty: row.difficulty ?? null,
			claimedAt: row.claimed_at ? new Date(row.claimed_at) : null,
			claimedBy: row.claimed_by ?? null,
			closedReason: row.closed_reason ?? null,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
		} as unknown as Task;
	}

	private rowToMilestone(row: MilestoneRow): Milestone {
		return {
			id: row.id,
			projectId: row.project_id,
			number: row.number,
			name: row.name,
			status: row.status as Milestone["status"],
			branch: row.branch,
			closeReason: row.close_reason ?? null,
			createdAt: new Date(row.created_at),
			updatedAt: new Date(row.updated_at),
			archivedAt: row.archived_at ? new Date(row.archived_at) : null,
		} as unknown as Milestone;
	}

	private rowToReview(row: {
		slice_id: string;
		type: string;
		reviewer: string;
		verdict: string;
		commit_sha: string;
		notes: string | null;
		created_at: string;
	}): ReviewRecord {
		return {
			sliceId: row.slice_id,
			type: row.type as ReviewType,
			reviewer: row.reviewer,
			verdict: row.verdict as ReviewRecord["verdict"],
			commitSha: row.commit_sha,
			notes: row.notes ?? undefined,
			createdAt: row.created_at,
		};
	}
}
