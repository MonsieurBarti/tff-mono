import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { runMigrations } from "@tff/core";
import type { MilestoneStatus, SliceStatus, TaskStatus } from "@tff/core";
import {
	type Dependency,
	MILESTONE_STATUSES,
	type Milestone,
	type Project,
	SLICE_STATUSES,
	type Slice,
	TASK_STATUSES,
	TIERS,
	type Task,
	type Tier,
} from "./dto.js";

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

export function openDatabase(path: string): Database.Database {
	const db = new Database(path);
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");
	return db;
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

export function applyMigrations(db: Database.Database, _opts?: { root?: string }): void {
	runMigrations(db);
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

interface ProjectRow {
	id: string;
	name: string;
	vision: string;
	created_at: string | number;
	updated_at?: string | number | null;
}

interface MilestoneRow {
	id: string;
	project_id: string;
	number: number;
	name: string;
	status: string;
	close_reason?: string | null;
	branch: string;
	archived_at?: number | null;
	created_at: string | number;
	updated_at?: string | number | null;
}

interface SliceRow {
	id: string;
	milestone_id: string;
	kind?: string;
	number: number;
	title: string;
	status: string;
	tier: string | null;
	base_branch?: string | null;
	branch_name?: string | null;
	archived_at?: number | null;
	pr_url: string | null;
	created_at: string | number;
	updated_at?: string | number | null;
}

interface TaskRow {
	id: string;
	slice_id: string;
	number: number;
	title: string;
	description?: string | null;
	status: string;
	wave: number | null;
	claimed_at?: number | null;
	claimed_by: string | null;
	closed_reason?: string | null;
	created_at: string | number;
	updated_at?: string | number | null;
}

interface DependencyRow {
	from_id: string;
	to_id: string;
}

function rowToProject(row: ProjectRow): Project {
	return {
		id: row.id,
		name: row.name,
		vision: row.vision,
		createdAt: String(row.created_at),
	};
}

function rowToMilestone(row: MilestoneRow): Milestone {
	const status = row.status === "open" ? "created" : row.status;
	if (!(MILESTONE_STATUSES as readonly string[]).includes(status)) {
		throw new Error(`Invalid milestone status in database: ${status}`);
	}
	return {
		id: row.id,
		projectId: row.project_id,
		number: row.number,
		name: row.name,
		status: status as MilestoneStatus,
		branch: row.branch,
		createdAt: String(row.created_at),
	};
}

function rowToSlice(row: SliceRow): Slice {
	// Coerce unknown statuses to 'created' rather than crashing.
	// Sub-agents can sometimes write invalid statuses via direct DB access.
	const status = (SLICE_STATUSES as readonly string[]).includes(row.status)
		? (row.status as SliceStatus)
		: ("created" as SliceStatus);
	if (row.tier !== null && !(TIERS as readonly string[]).includes(row.tier)) {
		throw new Error(`Invalid tier in database: ${row.tier}`);
	}
	return {
		id: row.id,
		milestoneId: row.milestone_id,
		number: row.number,
		title: row.title,
		status,
		tier: (row.tier ?? null) as Tier | null,
		prUrl: row.pr_url ?? null,
		createdAt: String(row.created_at),
	};
}

function rowToTask(row: TaskRow): Task {
	if (!(TASK_STATUSES as readonly string[]).includes(row.status)) {
		throw new Error(`Invalid task status in database: ${row.status}`);
	}
	return {
		id: row.id,
		sliceId: row.slice_id,
		number: row.number,
		title: row.title,
		status: row.status as TaskStatus,
		wave: row.wave ?? null,
		claimedBy: row.claimed_by ?? null,
		createdAt: String(row.created_at),
	};
}

function rowToDependency(row: DependencyRow): Dependency {
	return {
		fromTaskId: row.from_id,
		toTaskId: row.to_id,
	};
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export function insertProject(
	db: Database.Database,
	params: { name: string; vision: string; id?: string },
): string {
	const id = "singleton";
	db.prepare("INSERT INTO project (id, name, vision, updated_at) VALUES (?, ?, ?, ?)").run(
		id,
		params.name,
		params.vision,
		Date.now(),
	);
	return id;
}

export function getProject(db: Database.Database): Project | null {
	const row = db.prepare("SELECT * FROM project LIMIT 1").get() as ProjectRow | undefined;
	return row ? rowToProject(row) : null;
}

// ---------------------------------------------------------------------------
// Milestone
// ---------------------------------------------------------------------------

export function insertMilestone(
	db: Database.Database,
	params: { id?: string; projectId: string; number: number; name: string; branch: string },
): string {
	const id = params.id ?? randomUUID();
	db.prepare(
		"INSERT INTO milestone (id, project_id, number, name, status, branch, close_reason, archived_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
	).run(
		id,
		params.projectId,
		params.number,
		params.name,
		"created",
		params.branch,
		null,
		null,
		Date.now(),
	);
	return id;
}

export function getMilestones(db: Database.Database, projectId: string): Milestone[] {
	const rows = db
		.prepare("SELECT * FROM milestone WHERE project_id = ? ORDER BY number")
		.all(projectId) as MilestoneRow[];
	return rows.map(rowToMilestone);
}

export function getMilestone(db: Database.Database, id: string): Milestone | null {
	const row = db.prepare("SELECT * FROM milestone WHERE id = ?").get(id) as
		| MilestoneRow
		| undefined;
	return row ? rowToMilestone(row) : null;
}

export function updateMilestoneStatus(
	db: Database.Database,
	id: string,
	status: MilestoneStatus,
): void {
	db.prepare("UPDATE milestone SET status = ? WHERE id = ?").run(status, id);
}

export function getNextMilestoneNumber(db: Database.Database, projectId: string): number {
	const row = db
		.prepare("SELECT MAX(number) as max_num FROM milestone WHERE project_id = ?")
		.get(projectId) as { max_num: number | null } | undefined;
	return (row?.max_num ?? 0) + 1;
}

export function getActiveMilestone(db: Database.Database, projectId: string): Milestone | null {
	const row = db
		.prepare(
			"SELECT * FROM milestone WHERE project_id = ? AND status != 'closed' ORDER BY number LIMIT 1",
		)
		.get(projectId) as MilestoneRow | undefined;
	return row ? rowToMilestone(row) : null;
}

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export function insertSlice(
	db: Database.Database,
	params: { id?: string; milestoneId: string; number: number; title: string },
): string {
	const id = params.id ?? randomUUID();
	db.prepare(
		"INSERT INTO slice (id, milestone_id, kind, number, title, base_branch, branch_name, archived_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
	).run(id, params.milestoneId, "milestone", params.number, params.title, "", "", null, Date.now());
	return id;
}

export function getSlices(db: Database.Database, milestoneId: string): Slice[] {
	const rows = db
		.prepare("SELECT * FROM slice WHERE milestone_id = ? ORDER BY number")
		.all(milestoneId) as SliceRow[];
	return rows.map(rowToSlice);
}

export function getSlice(db: Database.Database, id: string): Slice | null {
	const row = db.prepare("SELECT * FROM slice WHERE id = ?").get(id) as SliceRow | undefined;
	return row ? rowToSlice(row) : null;
}

export function updateSliceTier(db: Database.Database, id: string, tier: Tier): void {
	db.prepare("UPDATE slice SET tier = ? WHERE id = ?").run(tier, id);
}

export function updateSlicePrUrl(db: Database.Database, id: string, prUrl: string): void {
	db.prepare("UPDATE slice SET pr_url = ? WHERE id = ?").run(prUrl, id);
}

export function clearSliceTasks(db: Database.Database, sliceId: string): void {
	db.transaction(() => {
		db.prepare(
			"DELETE FROM dependency WHERE from_id IN (SELECT id FROM task WHERE slice_id = ?) OR to_id IN (SELECT id FROM task WHERE slice_id = ?)",
		).run(sliceId, sliceId);
		db.prepare("DELETE FROM task WHERE slice_id = ?").run(sliceId);
	})();
}

export function getTasksByWave(db: Database.Database, sliceId: string): Map<number, Task[]> {
	const tasks = getTasks(db, sliceId);
	const grouped = new Map<number, Task[]>();
	for (const task of tasks) {
		if (task.wave === null) continue;
		const wave = grouped.get(task.wave);
		if (wave) {
			wave.push(task);
		} else {
			grouped.set(task.wave, [task]);
		}
	}
	return grouped;
}

export function resetTasksToOpen(db: Database.Database, sliceId: string): void {
	db.prepare("UPDATE task SET status = 'open', claimed_by = NULL WHERE slice_id = ?").run(sliceId);
}

export function getNextSliceNumber(db: Database.Database, milestoneId: string): number {
	const row = db
		.prepare("SELECT MAX(number) as max_num FROM slice WHERE milestone_id = ?")
		.get(milestoneId) as { max_num: number | null } | undefined;
	return (row?.max_num ?? 0) + 1;
}

export function getActiveSlice(db: Database.Database, milestoneId: string): Slice | null {
	const row = db
		.prepare(
			"SELECT * FROM slice WHERE milestone_id = ? AND status != 'closed' ORDER BY number LIMIT 1",
		)
		.get(milestoneId) as SliceRow | undefined;
	return row ? rowToSlice(row) : null;
}

export function countOpenSlicesInMilestone(db: Database.Database, milestoneId: string): number {
	const row = db
		.prepare<[string], { n: number }>(
			"SELECT COUNT(*) as n FROM slice WHERE milestone_id = ? AND status != 'closed'",
		)
		.get(milestoneId);
	return row?.n ?? 0;
}

/**
 * Returns the open (non-closed) slice with the lowest `number` in the given
 * milestone, excluding `excludeSliceId`. Used by the next-phase hint when a
 * slice has just shipped and we need to point the user at the next one.
 */
export function getNextOpenSliceInMilestone(
	db: Database.Database,
	milestoneId: string,
	excludeSliceId: string,
): Slice | null {
	const row = db
		.prepare(
			`SELECT * FROM slice
			 WHERE milestone_id = ? AND status != 'closed' AND id != ?
			 ORDER BY number ASC
			 LIMIT 1`,
		)
		.get(milestoneId, excludeSliceId) as SliceRow | undefined;
	return row ? rowToSlice(row) : null;
}

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export function insertTask(
	db: Database.Database,
	params: { id?: string; sliceId: string; number: number; title: string; wave?: number },
): string {
	const id = params.id ?? randomUUID();
	db.prepare(
		"INSERT INTO task (id, slice_id, number, title, description, wave, claimed_at, closed_reason, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
	).run(
		id,
		params.sliceId,
		params.number,
		params.title,
		null,
		params.wave ?? null,
		null,
		null,
		Date.now(),
	);
	return id;
}

export function getTasks(db: Database.Database, sliceId: string): Task[] {
	const rows = db
		.prepare("SELECT * FROM task WHERE slice_id = ? ORDER BY number")
		.all(sliceId) as TaskRow[];
	return rows.map(rowToTask);
}

export function getTask(db: Database.Database, id: string): Task | null {
	const row = db.prepare("SELECT * FROM task WHERE id = ?").get(id) as TaskRow | undefined;
	return row ? rowToTask(row) : null;
}

export function updateTaskStatus(
	db: Database.Database,
	id: string,
	status: TaskStatus,
	claimedBy?: string,
): void {
	db.prepare("UPDATE task SET status = ?, claimed_by = ? WHERE id = ?").run(
		status,
		claimedBy ?? null,
		id,
	);
}

export function updateTaskWave(db: Database.Database, id: string, wave: number): void {
	db.prepare("UPDATE task SET wave = ? WHERE id = ?").run(wave, id);
}

// ---------------------------------------------------------------------------
// Dependency
// ---------------------------------------------------------------------------

export function insertDependency(
	db: Database.Database,
	params: { fromTaskId: string; toTaskId: string },
): void {
	db.prepare("INSERT INTO dependency (from_id, to_id) VALUES (?, ?)").run(
		params.fromTaskId,
		params.toTaskId,
	);
}

export function getDependencies(db: Database.Database, sliceId: string): Dependency[] {
	const rows = db
		.prepare(
			`SELECT d.from_id, d.to_id
			FROM dependency d
			JOIN task t ON t.id = d.from_id OR t.id = d.to_id
			WHERE t.slice_id = ?
			GROUP BY d.from_id, d.to_id`,
		)
		.all(sliceId) as DependencyRow[];
	return rows.map(rowToDependency);
}

// ---------------------------------------------------------------------------
// PhaseRun
// ---------------------------------------------------------------------------

interface PhaseRunRow {
	id: string;
	slice_id: string;
	phase: string;
	status: string;
	started_at: string;
	finished_at: string | null;
	duration_ms: number | null;
	error: string | null;
	feedback: string | null;
	metadata: string | null;
	created_at: string | number;
}

export interface PhaseRun {
	id: string;
	sliceId: string;
	phase: string;
	status: string;
	startedAt: string;
	finishedAt: string | null;
	durationMs: number | null;
	error: string | null;
	feedback: string | null;
	metadata: string | null;
	createdAt: string;
}

function rowToPhaseRun(row: PhaseRunRow): PhaseRun {
	return {
		id: row.id,
		sliceId: row.slice_id,
		phase: row.phase,
		status: row.status,
		startedAt: row.started_at,
		finishedAt: row.finished_at ?? null,
		durationMs: row.duration_ms ?? null,
		error: row.error ?? null,
		feedback: row.feedback ?? null,
		metadata: row.metadata ?? null,
		createdAt: String(row.created_at),
	};
}

export function insertPhaseRun(
	db: Database.Database,
	params: { sliceId: string; phase: string; status: string; startedAt: string },
): string {
	// Duplicate-started guard: if a 'started' or 'retried' row exists for
	// (sliceId, phase), treat insert as idempotent and return its id.
	// Allows phase re-entry (e.g. execute after verify failure) without
	// creating duplicate in-flight rows.
	if (params.status === "started" || params.status === "retried") {
		const existing = db
			.prepare(
				`SELECT id FROM phase_run
			 WHERE slice_id = ? AND phase = ? AND status IN ('started', 'retried')
			 ORDER BY rowid DESC LIMIT 1`,
			)
			.get(params.sliceId, params.phase) as { id: string } | undefined;
		if (existing) return existing.id;
	}

	const id = randomUUID();
	db.prepare(
		"INSERT INTO phase_run (id, slice_id, phase, status, started_at) VALUES (?, ?, ?, ?, ?)",
	).run(id, params.sliceId, params.phase, params.status, params.startedAt);
	return id;
}

export function updatePhaseRun(
	db: Database.Database,
	id: string,
	params: {
		status: string;
		finishedAt?: string;
		durationMs?: number;
		error?: string;
		feedback?: string;
		metadata?: string;
	},
): void {
	db.prepare(
		`UPDATE phase_run SET
			status = ?,
			finished_at = COALESCE(?, finished_at),
			duration_ms = COALESCE(?, duration_ms),
			error = COALESCE(?, error),
			feedback = COALESCE(?, feedback),
			metadata = COALESCE(?, metadata)
		WHERE id = ?`,
	).run(
		params.status,
		params.finishedAt ?? null,
		params.durationMs ?? null,
		params.error ?? null,
		params.feedback ?? null,
		params.metadata ?? null,
		id,
	);
}

export function getPhaseRuns(db: Database.Database, sliceId: string): PhaseRun[] {
	const rows = db
		.prepare("SELECT * FROM phase_run WHERE slice_id = ? ORDER BY created_at")
		.all(sliceId) as PhaseRunRow[];
	return rows.map(rowToPhaseRun);
}

export function getLatestPhaseRun(
	db: Database.Database,
	sliceId: string,
	phase?: string,
): PhaseRun | null {
	if (phase !== undefined) {
		const row = db
			.prepare(
				"SELECT * FROM phase_run WHERE slice_id = ? AND phase = ? ORDER BY rowid DESC LIMIT 1",
			)
			.get(sliceId, phase) as PhaseRunRow | undefined;
		return row ? rowToPhaseRun(row) : null;
	}
	const row = db
		.prepare("SELECT * FROM phase_run WHERE slice_id = ? ORDER BY rowid DESC LIMIT 1")
		.get(sliceId) as PhaseRunRow | undefined;
	return row ? rowToPhaseRun(row) : null;
}

export function recoverOrphanedPhaseRuns(db: Database.Database): number {
	const result = db
		.prepare(
			"UPDATE phase_run SET status = 'abandoned', finished_at = datetime('now') WHERE status = 'started'",
		)
		.run();
	return result.changes;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function exportState(db: Database.Database): string {
	const projects = (db.prepare("SELECT * FROM project").all() as ProjectRow[]).map(rowToProject);
	const milestones = (db.prepare("SELECT * FROM milestone").all() as MilestoneRow[]).map(
		rowToMilestone,
	);
	const slices = (db.prepare("SELECT * FROM slice").all() as SliceRow[]).map(rowToSlice);
	const tasks = (db.prepare("SELECT * FROM task").all() as TaskRow[]).map(rowToTask);
	const dependencies = (db.prepare("SELECT * FROM dependency").all() as DependencyRow[]).map(
		rowToDependency,
	);

	return JSON.stringify({ projects, milestones, slices, tasks, dependencies }, null, 2);
}
