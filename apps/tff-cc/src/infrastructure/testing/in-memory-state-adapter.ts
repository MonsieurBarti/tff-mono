import type {
	MilestoneProps,
	MilestoneStatus,
	MilestoneStore,
	MilestoneUpdateProps,
	ProjectProps,
	ProjectStore,
	Result,
	SliceProps,
	SliceStatus,
	SliceStore,
	SliceUpdateProps,
	TaskProps,
	TaskStore,
	TaskUpdateProps,
} from "@tff/core";
import {
	DomainEvent,
	Err,
	Milestone,
	Ok,
	Project,
	Slice,
	Task,
	milestoneBranchName,
	SLICE_TRANSITIONS,
} from "@tff/core";
import type { DomainError } from "../errors/generic-domain-error.js";
import { GenericDomainError } from "../errors/generic-domain-error.js";
import type { DatabaseInit } from "../../domain/ports/database-init.port.js";
import type { DependencyStore } from "../../domain/ports/dependency-store.port.js";
import type { ReviewStore } from "../../domain/ports/review-store.port.js";
import type { SessionStore } from "../../domain/ports/session-store.port.js";
import type {
	SliceDependency,
	SliceDependencyStore,
} from "../../domain/ports/slice-dependency-store.port.js";
import type { TransactionRunner } from "../../domain/ports/transaction-runner.port.js";
import type { Dependency } from "../../shared/value-objects/dependency.js";
import type { ReviewRecord, ReviewType } from "../../shared/value-objects/review-record.js";
import type { WorkflowSession } from "../../shared/value-objects/workflow-session.js";

/**
 * Test-only in-memory implementation of the state ports. NOT intended for
 * production: `transaction()` uses `structuredClone` to snapshot every
 * top-level field on each call, which is fine for tests but quadratic for
 * real workloads. Use `SQLiteStateAdapter` for any persistent use.
 */
export class InMemoryStateAdapter
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
		ReviewStore
{
	private project: Project | null = null;
	private milestones = new Map<string, Milestone>();
	private slices = new Map<string, Slice>();
	private tasks = new Map<string, Task>();
	public dependencies: Array<{ fromId: string; toId: string; type: string }> = [];
	private sliceDependencies: Array<{ fromId: string; toId: string }> = [];
	private session: WorkflowSession | null = null;
	private reviews: ReviewRecord[] = [];

	init(): Result<void, DomainError> {
		return Ok(undefined);
	}

	/**
	 * Best-effort snapshot/restore transaction.
	 * Snapshots all state fields before calling fn; restores them on throw.
	 * Uses `structuredClone` (Node >=17) for deep copies so mutations inside
	 * fn do not corrupt the snapshot. On success the changes are kept as-is.
	 * Our engines.node floor (>=20) covers this.
	 */
	transaction<T>(fn: () => T): T {
		const snapshot = {
			project: this.project ? Project.reconstruct(this.project.toJSON()) : null,
			milestones: new Map(
				Array.from(this.milestones.entries()).map(([k, v]) => [
					k,
					Milestone.reconstruct(v.toJSON()),
				]),
			),
			slices: new Map(
				Array.from(this.slices.entries()).map(([k, v]) => [k, Slice.reconstruct(v.toJSON())]),
			),
			tasks: new Map(
				Array.from(this.tasks.entries()).map(([k, v]) => [k, Task.reconstruct(v.toJSON())]),
			),
			dependencies: structuredClone(this.dependencies),
			sliceDependencies: structuredClone(this.sliceDependencies),
			session: structuredClone(this.session),
			reviews: structuredClone(this.reviews),
		};
		try {
			return fn();
		} catch (e) {
			this.project = snapshot.project;
			this.milestones = snapshot.milestones;
			this.slices = snapshot.slices;
			this.tasks = snapshot.tasks;
			this.dependencies = snapshot.dependencies;
			this.sliceDependencies = snapshot.sliceDependencies;
			this.session = snapshot.session;
			this.reviews = snapshot.reviews;
			throw e;
		}
	}

	// ProjectStore
	getProject(): Result<Project | null, DomainError> {
		return Ok(this.project);
	}

	saveProject(props: ProjectProps): Result<Project, DomainError> {
		// TODO(S04): Replace with Project.reconstruct() once in-memory adapter aligns with core entities
		const project = Project.reconstruct({
			id: "singleton",
			name: props.name,
			vision: props.vision ?? "",
			createdAt: this.project?.createdAt ?? new Date(),
			updatedAt: new Date(),
		});
		this.project = project;
		return Ok(project);
	}

	// MilestoneStore
	createMilestone(props: MilestoneProps): Result<Milestone, DomainError> {
		// Use provided id or generate a new UUID
		const id = props.id ?? crypto.randomUUID();
		// Use provided branch or compute from UUID
		const branch = props.branch ?? milestoneBranchName(id);
		const milestone = Milestone.reconstruct({
			id,
			projectId: "singleton",
			number: props.number,
			name: props.name,
			status: "open" as MilestoneStatus,
			branch,
			closeReason: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			archivedAt: null,
		});
		this.milestones.set(id, milestone);
		return Ok(milestone);
	}

	getMilestone(id: string): Result<Milestone | null, DomainError> {
		return Ok(this.milestones.get(id) ?? null);
	}

	getMilestoneByNumber(number: number): Result<Milestone | null, DomainError> {
		const matches = [...this.milestones.values()].filter(
			(m) => m.number === number && m.archivedAt == null,
		);
		if (matches.length === 0) return Ok(null);
		const found = matches.reduce((latest, m) =>
			m.createdAt.getTime() > latest.createdAt.getTime() ? m : latest,
		);
		return Ok(found);
	}

	listMilestones(options?: { includeArchived?: boolean }): Result<Milestone[], DomainError> {
		const all = [...this.milestones.values()];
		if (options?.includeArchived === true) return Ok(all);
		return Ok(all.filter((m) => m.archivedAt == null));
	}

	updateMilestone(id: string, updates: MilestoneUpdateProps): Result<void, DomainError> {
		const ms = this.milestones.get(id);
		if (!ms) return Ok(undefined);
		this.milestones.set(
			id,
			Milestone.reconstruct({
				id: ms.id,
				projectId: ms.projectId,
				number: ms.number,
				name: updates.name ?? ms.name,
				status: updates.status ?? ms.status,
				branch: ms.branch,
				closeReason: ms.closeReason,
				createdAt: ms.createdAt,
				updatedAt: new Date(),
				archivedAt: ms.archivedAt,
			}),
		);
		return Ok(undefined);
	}

	archiveMilestoneCascade(id: string): Result<{ slicesArchived: number }, DomainError> {
		return this.transaction(() => {
			const ms = this.milestones.get(id);
			if (!ms) return Ok({ slicesArchived: 0 });
			const now = new Date();
			let slicesArchived = 0;
			for (const slice of this.slices.values()) {
				if (slice.milestoneId === id && slice.archivedAt == null) {
					this.slices.set(
						slice.id,
						Slice.reconstruct({
							id: slice.id,
							milestoneId: slice.milestoneId,
							kind: slice.kind,
							number: slice.number,
							title: slice.title,
							status: slice.status,
							tier: slice.tier,
							baseBranch: slice.baseBranch,
							branchName: slice.branchName,
							createdAt: slice.createdAt,
							updatedAt: new Date(),
							archivedAt: now,
						}),
					);
					slicesArchived += 1;
				}
			}
			if (ms.archivedAt == null) {
				this.milestones.set(
					id,
					Milestone.reconstruct({
						id: ms.id,
						projectId: ms.projectId,
						number: ms.number,
						name: ms.name,
						status: ms.status,
						branch: ms.branch,
						closeReason: ms.closeReason,
						createdAt: ms.createdAt,
						updatedAt: new Date(),
						archivedAt: now,
					}),
				);
			}
			return Ok({ slicesArchived });
		});
	}

	closeMilestone(id: string, reason?: string): Result<void, DomainError> {
		const ms = this.milestones.get(id);
		if (!ms) return Ok(undefined);
		try {
			// Per-slice spec-approval invariant: every slice in the milestone must have
			// at least one approved `type: "spec"` review. Fires regardless of slice state.
			const milestoneSlices = [...this.slices.values()].filter((s) => s.milestoneId === id);
			const missing: string[] = [];
			for (const slice of milestoneSlices) {
				const hasApprovedSpec = this.reviews.some(
					(r) => r.sliceId === slice.id && r.type === "spec" && r.verdict === "approved",
				);
				if (!hasApprovedSpec) missing.push(slice.id);
			}
			if (missing.length > 0) {
				return Err(
					new GenericDomainError(
						"MILESTONE_COMPLETENESS_VIOLATION",
						`Milestone "${id}" missing approved spec reviews for slices: ${missing.join(", ")}`,
						{ milestoneId: id, missing },
					),
				);
			}
			const openSlices = milestoneSlices.filter((s) => s.status !== "closed");
			if (openSlices.length > 0) {
				return Err(
					new GenericDomainError(
						"HAS_OPEN_CHILDREN",
						`Milestone "${id}" has ${openSlices.length} open slice(s)`,
						{ milestoneId: id, openCount: openSlices.length },
					),
				);
			}
			this.milestones.set(
				id,
				Milestone.reconstruct({
					id: ms.id,
					projectId: ms.projectId,
					number: ms.number,
					name: ms.name,
					status: "closed",
					branch: ms.branch,
					closeReason: reason ?? null,
					createdAt: ms.createdAt,
					updatedAt: new Date(),
					archivedAt: ms.archivedAt,
				}),
			);
			return Ok(undefined);
		} catch (e) {
			return Err(new GenericDomainError("WRITE_FAILURE", `Failed to close milestone: ${e}`));
		}
	}

	// SliceStore
	createSlice(props: SliceProps): Result<Slice, DomainError> {
		const kind = props.kind ?? "milestone";
		if (kind === "milestone") {
			if (!props.milestoneId) {
				return Err(
					new GenericDomainError(
						"VALIDATION_ERROR",
						"milestoneId is required for milestone slices",
					),
				);
			}
			const milestone = this.milestones.get(props.milestoneId);
			if (!milestone) {
				return Err(
					new GenericDomainError("NOT_FOUND", `Milestone "${props.milestoneId}" not found`),
				);
			}
		}
		// Use provided id or generate a new UUID
		const id = props.id ?? crypto.randomUUID();
		const slice = Slice.reconstruct({
			id,
			milestoneId: props.milestoneId ?? null,
			kind,
			number: props.number,
			title: props.title,
			status: "discussing",
			tier: props.tier ?? null,
			baseBranch: props.baseBranch ?? "",
			branchName: props.branchName ?? "",
			createdAt: new Date(),
			updatedAt: new Date(),
			archivedAt: null,
		});
		this.slices.set(id, slice);
		return Ok(slice);
	}

	getSlice(id: string): Result<Slice | null, DomainError> {
		return Ok(this.slices.get(id) ?? null);
	}

	getSliceByNumbers(
		milestoneNumber: number,
		sliceNumber: number,
	): Result<Slice | null, DomainError> {
		const milestone = [...this.milestones.values()].find(
			(m) => m.number === milestoneNumber && m.archivedAt == null,
		);
		if (!milestone) return Ok(null);
		const matches = [...this.slices.values()].filter(
			(s) => s.milestoneId === milestone.id && s.number === sliceNumber && s.archivedAt == null,
		);
		if (matches.length === 0) return Ok(null);
		const slice = matches.reduce((latest, s) =>
			s.createdAt.getTime() > latest.createdAt.getTime() ? s : latest,
		);
		return Ok(slice);
	}

	listSlices(
		milestoneIdOrOptions?: string | { milestoneId?: string; includeArchived?: boolean },
	): Result<Slice[], DomainError> {
		const opts =
			typeof milestoneIdOrOptions === "string"
				? { milestoneId: milestoneIdOrOptions, includeArchived: false }
				: (milestoneIdOrOptions ?? {});
		const includeArchived = opts.includeArchived === true;
		let all = [...this.slices.values()];
		if (!includeArchived) all = all.filter((s) => s.archivedAt == null);
		if (opts.milestoneId) {
			return Ok(all.filter((s) => s.milestoneId === opts.milestoneId));
		}
		return Ok(all);
	}

	listSlicesByKind(
		kind: Slice["kind"],
		options?: { includeArchived?: boolean },
	): Result<Slice[], DomainError> {
		const includeArchived = options?.includeArchived === true;
		let all = [...this.slices.values()];
		if (!includeArchived) all = all.filter((s) => s.archivedAt == null);
		return Ok(all.filter((s) => s.kind === kind));
	}

	updateSlice(id: string, updates: SliceUpdateProps): Result<void, DomainError> {
		const slice = this.slices.get(id);
		if (!slice) return Ok(undefined);
		this.slices.set(
			id,
			Slice.reconstruct({
				id: slice.id,
				milestoneId: slice.milestoneId,
				kind: slice.kind,
				number: slice.number,
				title: updates.title ?? slice.title,
				status: slice.status,
				tier: updates.tier ?? slice.tier,
				baseBranch: slice.baseBranch,
				branchName: slice.branchName,
				createdAt: slice.createdAt,
				updatedAt: new Date(),
				archivedAt: slice.archivedAt,
			}),
		);
		return Ok(undefined);
	}

	transitionSlice(id: string, target: SliceStatus): Result<DomainEvent<unknown>[], DomainError> {
		const slice = this.slices.get(id);
		if (!slice) {
			return Err(new GenericDomainError("NOT_FOUND", `Slice "${id}" not found`));
		}
		if (target === "closed" && slice.status === "shipping") {
			const approvedTypes = new Set(
				this.reviews.filter((r) => r.sliceId === id && r.verdict === "approved").map((r) => r.type),
			);
			const missing: Array<"code" | "security"> = [];
			if (!approvedTypes.has("code")) missing.push("code");
			if (!approvedTypes.has("security")) missing.push("security");
			if (missing.length > 0) {
				return Err(
					new GenericDomainError(
						"SHIP_COMPLETENESS_VIOLATION",
						`Slice "${id}" missing required reviews: ${missing.join(", ")}`,
						{ sliceId: id, missing },
					),
				);
			}
		}
		const allowed = SLICE_TRANSITIONS[slice.status];
		if (!allowed.includes(target)) {
			return Err(
				new GenericDomainError(
					"INVALID_TRANSITION",
					`Cannot transition slice "${id}" from "${slice.status}" to "${target}"`,
					{ sliceId: id, from: slice.status, to: target, expected: allowed },
				),
			);
		}
		const from = slice.status;
		this.slices.set(
			id,
			Slice.reconstruct({
				id: slice.id,
				milestoneId: slice.milestoneId,
				kind: slice.kind,
				number: slice.number,
				title: slice.title,
				status: target,
				tier: slice.tier,
				baseBranch: slice.baseBranch,
				branchName: slice.branchName,
				createdAt: slice.createdAt,
				updatedAt: new Date(),
				archivedAt: slice.archivedAt,
			}),
		);
		const event = DomainEvent.create("slice.transitioned", { sliceId: id, from, to: target });
		return Ok([event]);
	}

	archiveSlice(id: string): Result<void, DomainError> {
		const slice = this.slices.get(id);
		if (!slice) return Ok(undefined);
		if (slice.archivedAt != null) return Ok(undefined);
		this.slices.set(
			id,
			Slice.reconstruct({
				id: slice.id,
				milestoneId: slice.milestoneId,
				kind: slice.kind,
				number: slice.number,
				title: slice.title,
				status: slice.status,
				tier: slice.tier,
				baseBranch: slice.baseBranch,
				branchName: slice.branchName,
				createdAt: slice.createdAt,
				updatedAt: new Date(),
				archivedAt: new Date(),
			}),
		);
		return Ok(undefined);
	}

	// TaskStore
	createTask(props: TaskProps): Result<Task, DomainError> {
		const id = `${props.sliceId}-T${props.number.toString().padStart(2, "0")}`;
		// TODO(S04): Replace with Task.reconstruct() once in-memory adapter aligns with core entities
		const task = Task.reconstruct({
			id,
			sliceId: props.sliceId,
			number: props.number,
			title: props.title,
			description: props.description ?? "",
			status: "open",
			wave: props.wave ?? null,
			difficulty: null,
			claimedAt: null,
			claimedBy: null,
			closedReason: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		this.tasks.set(id, task);
		return Ok(task);
	}

	getTask(id: string): Result<Task | null, DomainError> {
		return Ok(this.tasks.get(id) ?? null);
	}

	listTasks(sliceId: string): Result<Task[], DomainError> {
		return Ok([...this.tasks.values()].filter((t) => t.sliceId === sliceId));
	}

	updateTask(id: string, updates: TaskUpdateProps): Result<void, DomainError> {
		const task = this.tasks.get(id);
		if (!task) return Ok(undefined);
		this.tasks.set(
			id,
			Task.reconstruct({
				id: task.id,
				sliceId: task.sliceId,
				number: task.number,
				title: updates.title ?? task.title,
				description: updates.description ?? task.description,
				status: task.status,
				wave: updates.wave ?? task.wave,
				difficulty: task.difficulty,
				claimedAt: task.claimedAt,
				claimedBy: task.claimedBy,
				closedReason: task.closedReason,
				createdAt: task.createdAt,
				updatedAt: new Date(),
			}),
		);
		return Ok(undefined);
	}

	claimTask(id: string, claimedBy?: string): Result<void, DomainError> {
		const task = this.tasks.get(id);
		if (!task || task.status !== "open") {
			return Err(new GenericDomainError("ALREADY_CLAIMED", `Task "${id}" is already claimed`));
		}
		this.tasks.set(
			id,
			Task.reconstruct({
				id: task.id,
				sliceId: task.sliceId,
				number: task.number,
				title: task.title,
				description: task.description,
				status: "in_progress",
				wave: task.wave,
				difficulty: task.difficulty,
				claimedAt: new Date(),
				claimedBy: claimedBy ?? null,
				closedReason: task.closedReason,
				createdAt: task.createdAt,
				updatedAt: new Date(),
			}),
		);
		return Ok(undefined);
	}

	getExecutorsForSlice(sliceId: string): Result<string[], DomainError> {
		const executors = [
			...new Set(
				[...this.tasks.values()]
					.filter((t) => t.sliceId === sliceId && t.claimedBy !== undefined)
					.map((t) => t.claimedBy as string),
			),
		];
		return Ok(executors);
	}

	closeTask(id: string, reason?: string): Result<void, DomainError> {
		const task = this.tasks.get(id);
		if (!task) return Ok(undefined);
		this.tasks.set(
			id,
			Task.reconstruct({
				id: task.id,
				sliceId: task.sliceId,
				number: task.number,
				title: task.title,
				description: task.description,
				status: "closed",
				wave: task.wave,
				difficulty: task.difficulty,
				claimedAt: task.claimedAt,
				claimedBy: task.claimedBy,
				closedReason: reason ?? null,
				createdAt: task.createdAt,
				updatedAt: new Date(),
			}),
		);
		return Ok(undefined);
	}

	listReadyTasks(sliceId: string): Result<Task[], DomainError> {
		const sliceTasks = [...this.tasks.values()].filter(
			(t) => t.sliceId === sliceId && t.status === "open",
		);
		const ready = sliceTasks.filter((task) => {
			// Find all deps where this task is the "from" side (task depends on toId)
			const blocking = this.dependencies.filter((d) => d.fromId === task.id);
			return blocking.every((dep) => {
				const blocker = this.tasks.get(dep.toId);
				return blocker?.status === "closed";
			});
		});
		return Ok(ready);
	}

	listStaleClaims(ttlMinutes: number): Result<Task[], DomainError> {
		const cutoff = new Date(Date.now() - ttlMinutes * 60 * 1000);
		const stale = [...this.tasks.values()].filter(
			(t) => t.status === "in_progress" && t.claimedAt != null && t.claimedAt < cutoff,
		);
		return Ok(stale);
	}

	// DependencyStore
	addDependency(fromId: string, toId: string, type: "blocks"): Result<void, DomainError> {
		const existing = this.dependencies.find((d) => d.fromId === fromId && d.toId === toId);
		if (!existing) {
			this.dependencies.push({ fromId, toId, type });
		}
		return Ok(undefined);
	}

	removeDependency(fromId: string, toId: string): Result<void, DomainError> {
		this.dependencies = this.dependencies.filter((d) => !(d.fromId === fromId && d.toId === toId));
		return Ok(undefined);
	}

	getDependencies(taskId: string): Result<Dependency[], DomainError> {
		const deps = this.dependencies
			.filter((d) => d.fromId === taskId || d.toId === taskId)
			.map((d) => ({ fromId: d.fromId, toId: d.toId, type: d.type as "blocks" }));
		return Ok(deps);
	}

	// SliceDependencyStore
	addSliceDependency(fromId: string, toId: string): Result<void, DomainError> {
		const existing = this.sliceDependencies.find((d) => d.fromId === fromId && d.toId === toId);
		if (!existing) {
			this.sliceDependencies.push({ fromId, toId });
		}
		return Ok(undefined);
	}

	removeSliceDependency(fromId: string, toId: string): Result<void, DomainError> {
		this.sliceDependencies = this.sliceDependencies.filter(
			(d) => !(d.fromId === fromId && d.toId === toId),
		);
		return Ok(undefined);
	}

	getSliceDependencies(sliceId: string): Result<SliceDependency[], DomainError> {
		const deps = this.sliceDependencies.filter((d) => d.fromId === sliceId || d.toId === sliceId);
		return Ok(deps);
	}

	// SessionStore
	getSession(): Result<WorkflowSession | null, DomainError> {
		return Ok(this.session);
	}

	saveSession(session: WorkflowSession): Result<void, DomainError> {
		this.session = session;
		return Ok(undefined);
	}

	// ReviewStore
	recordReview(review: ReviewRecord): Result<void, DomainError> {
		const executorsResult = this.getExecutorsForSlice(review.sliceId);
		if (!executorsResult.ok) return executorsResult;
		if (executorsResult.data.includes(review.reviewer)) {
			return Err(
				new GenericDomainError(
					"FRESH_REVIEWER_VIOLATION",
					`Reviewer "${review.reviewer}" is an executor of slice "${review.sliceId}"`,
					{ sliceId: review.sliceId, reviewer: review.reviewer },
				),
			);
		}
		this.reviews.push(review);
		return Ok(undefined);
	}

	getLatestReview(sliceId: string, type: ReviewType): Result<ReviewRecord | null, DomainError> {
		const matching = this.reviews
			.filter((r) => r.sliceId === sliceId && r.type === type)
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
		return Ok(matching[0] ?? null);
	}

	listReviews(sliceId: string): Result<ReviewRecord[], DomainError> {
		return Ok(this.reviews.filter((r) => r.sliceId === sliceId));
	}

	// Test helpers
	seedReviews(reviews: ReviewRecord[]): void {
		this.reviews.push(...reviews);
	}

	seedExecutors(sliceId: string, agents: string[]): void {
		agents.forEach((agent, idx) => {
			const id = `${sliceId}-executor-seed-${idx}`;
			const existing = this.tasks.get(id);
			if (existing) {
				this.tasks.set(
					id,
					Task.reconstruct({
						id: existing.id,
						sliceId: existing.sliceId,
						number: existing.number,
						title: existing.title,
						description: existing.description,
						status: existing.status,
						wave: existing.wave,
						difficulty: existing.difficulty,
						claimedAt: existing.claimedAt,
						claimedBy: agent,
						closedReason: existing.closedReason,
						createdAt: existing.createdAt,
						updatedAt: new Date(),
					}),
				);
			} else {
				this.tasks.set(
					id,
					Task.reconstruct({
						id,
						sliceId,
						number: 9000 + idx,
						title: `__seed_executor_${agent}`,
						description: "",
						status: "in_progress",
						wave: null,
						difficulty: null,
						claimedBy: agent,
						claimedAt: new Date(),
						closedReason: null,
						createdAt: new Date(),
						updatedAt: new Date(),
					}),
				);
			}
		});
	}
}
