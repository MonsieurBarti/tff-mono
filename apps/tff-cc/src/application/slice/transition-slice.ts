import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	type BaseDomainError,
	PreconditionViolationError,
	SliceInvalidTransitionError,
	SliceNotFoundError,
	SLICE_TRANSITIONS,
	type SliceStatus,
	validateTransition,
} from "@tff/core";
import { resolveSliceId } from "../../cli/utils/resolve-id.js";
import { tffWarn } from "../../infrastructure/adapters/logging/warn.js";
import type { ClosableStateStores } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { stageStateMdTmp } from "../../infrastructure/persistence/stage-state-md.js";
import { mkdirTracked } from "../../infrastructure/persistence/track-mkdir.js";
import { withTransaction } from "../../infrastructure/persistence/with-transaction.js";
import { renderCheckpoint } from "../checkpoint/save-checkpoint.js";
import { renderStateMd } from "../sync/generate-state.js";

export interface TransitionSliceRequest {
	sliceLabel: string;
	targetStatus: SliceStatus;
	cwd: string;
}

export interface TransitionSliceSuccess {
	ok: true;
	data: { status: SliceStatus };
	warnings: BaseDomainError<unknown>[];
}

export interface TransitionSliceFailure {
	ok: false;
	error: BaseDomainError<unknown>;
}

export type TransitionSliceResponse = TransitionSliceSuccess | TransitionSliceFailure;

export interface TransitionSliceDeps {
	stores: ClosableStateStores;
}

const sliceLabelFromSlice = (slice: { number: number }, milestoneNumber: number): string => {
	const ms = String(milestoneNumber).padStart(2, "0");
	const sn = String(slice.number).padStart(2, "0");
	return `M${ms}-S${sn}`;
};

const validTransitionsFrom = (status: SliceStatus): readonly SliceStatus[] =>
	SLICE_TRANSITIONS[status] ?? [];

const validPredecessorsOf = (target: SliceStatus): readonly SliceStatus[] =>
	(Object.entries(SLICE_TRANSITIONS) as [SliceStatus, readonly SliceStatus[]][])
		.filter(([, nexts]) => nexts.includes(target))
		.map(([from]) => from);

/**
 * Orchestrates a slice status transition end-to-end:
 * - resolves the slice id (label or UUID),
 * - precondition-validates the transition (pure domain),
 * - pre-stages STATE.md and CHECKPOINT.md to *.tmp,
 * - runs the DB update inside withTransaction with a TOCTOU re-check,
 * - returns the response shape the CLI adapter serializes as JSON.
 *
 * This module is pure orchestration: the CLI command file is a thin adapter
 * that parses flags, opens stores, calls this, and serializes the response.
 */
export const transitionSliceOrchestrator = async (
	req: TransitionSliceRequest,
	deps: TransitionSliceDeps,
): Promise<TransitionSliceResponse> => {
	const { sliceLabel, targetStatus, cwd } = req;
	const { db, sliceStore, milestoneStore, taskStore } = deps.stores;

	const resolvedSlice = resolveSliceId(sliceLabel, sliceStore);
	if (!resolvedSlice.ok) return { ok: false, error: resolvedSlice.error };
	const sliceId = resolvedSlice.data;

	// Read current slice and milestone (outside tx).
	const currentResult = sliceStore.getSlice(sliceId);
	if (!currentResult.ok) return { ok: false, error: currentResult.error };
	if (!currentResult.data) {
		return {
			ok: false,
			error: new SliceNotFoundError(`Slice "${sliceId}" not found`, sliceId),
		};
	}
	const currentSlice = currentResult.data;

	// Pre-validate transition (pure domain) so we surface INVALID_TRANSITION
	// with a recovery hint without entering the tx.
	const validation = validateTransition(currentSlice.status, targetStatus, SLICE_TRANSITIONS);
	if (!validation.ok) {
		const validNext = validTransitionsFrom(currentSlice.status);
		const predecessors = validPredecessorsOf(targetStatus);
		const recoveryHint =
			predecessors.length > 0
				? `Valid predecessors of '${targetStatus}': [${predecessors.join(", ")}]. Transition through one of those first.`
				: validNext.length > 0
					? `Valid next from '${currentSlice.status}': [${validNext.join(", ")}]`
					: "No valid transitions available from this status";
		return {
			ok: false,
			error: new SliceInvalidTransitionError(
				`Invalid transition from ${currentSlice.status} to ${targetStatus}`,
				currentSlice.status,
				targetStatus,
				validNext,
				recoveryHint,
			),
		};
	}

	if (!currentSlice.milestoneId) {
		return {
			ok: false,
			error: new SliceNotFoundError(
				`Slice "${sliceId}" has no milestone (kind=${currentSlice.kind}); transition not yet supported for ad-hoc slices`,
				sliceId,
			),
		};
	}
	const milestoneId = currentSlice.milestoneId;
	const milestoneResult = milestoneStore.getMilestone(milestoneId);
	if (!milestoneResult.ok) return { ok: false, error: milestoneResult.error };
	if (!milestoneResult.data) {
		return {
			ok: false,
			error: new SliceNotFoundError(`Milestone "${milestoneId}" not found`, milestoneId),
		};
	}
	const milestoneNumber = milestoneResult.data.number;
	const displaySliceLabel = sliceLabelFromSlice(currentSlice, milestoneNumber);

	// Render STATE.md content (reflecting the post-transition state).
	// We patch the slice status in-memory to simulate post-commit state; the
	// renderer is pure so this is safe.
	const projectedSlice = { ...currentSlice, status: targetStatus };
	const stateContent = renderStateMd(
		{ milestoneId },
		{
			milestoneStore,
			sliceStore: {
				...sliceStore,
				listSlices: (mid?: string) => {
					const base = sliceStore.listSlices(mid);
					if (!base.ok) return base;
					const swapped = base.data.map((s: { id: string }) =>
						s.id === projectedSlice.id ? projectedSlice : s,
					);
					return { ok: true as const, data: swapped };
				},
			},
			taskStore,
		},
	);
	if (!stateContent.ok) return { ok: false, error: stateContent.error };

	// Pre-tx staging: STATE.md + CHECKPOINT.md to *.tmp.
	const stagedTmps: string[] = [];
	const stagedDirs: string[] = [];

	const { stateFinalAbs, stateTmpAbs } = stageStateMdTmp(cwd, stagedTmps, stagedDirs);
	writeFileSync(stateTmpAbs, stateContent.data, "utf8");

	const checkpoint = renderCheckpoint({
		sliceId: displaySliceLabel,
		baseCommit: "",
		currentWave: 0,
		completedWaves: [],
		completedTasks: [],
		executorLog: [],
	});
	const ckptDirAbs = resolve(cwd, checkpoint.dir);
	const ckptFinalAbs = resolve(cwd, checkpoint.path);
	const ckptTmpAbs = `${ckptFinalAbs}.tmp`;
	stagedDirs.push(...mkdirTracked(ckptDirAbs));
	writeFileSync(ckptTmpAbs, checkpoint.content, "utf8");
	stagedTmps.push(ckptTmpAbs);

	// Closure-capture pattern (see with-transaction.ts JSDoc): if the TOCTOU
	// precondition re-check fails we capture the BaseDomainError and throw a
	// generic Error to trigger rollback. The outer handler re-surfaces the
	// captured error instead of the generic TRANSACTION_ROLLBACK wrapper so
	// the public error code stays PRECONDITION_VIOLATION.
	let preconditionRollbackError: BaseDomainError<unknown> | undefined;

	const txResult = await withTransaction(
		db,
		() => {
			// TOCTOU re-check: verify slice still has the expected status.
			const recheck = sliceStore.getSlice(sliceId);
			if (!recheck.ok) {
				preconditionRollbackError = new PreconditionViolationError(
					`TOCTOU re-check failed: store error`,
					[`Store error during re-check: ${recheck.error.message}`],
				);
				throw new Error(preconditionRollbackError.message);
			}
			if (!recheck.data) {
				preconditionRollbackError = new PreconditionViolationError(
					`TOCTOU re-check failed: slice "${sliceId}" not found`,
					[`Slice not found during re-check`],
				);
				throw new Error(preconditionRollbackError.message);
			}
			if (recheck.data.status !== currentSlice.status) {
				preconditionRollbackError = new PreconditionViolationError(
					`TOCTOU re-check failed: slice status changed from '${currentSlice.status}' to '${recheck.data.status}'`,
					[`Expected status '${currentSlice.status}', found '${recheck.data.status}'`],
				);
				throw new Error(preconditionRollbackError.message);
			}

			const transitionResult = sliceStore.transitionSlice(sliceId, targetStatus);
			if (!transitionResult.ok) {
				throw new Error(`Store transition failed: ${transitionResult.error.message}`);
			}
			return {
				data: { status: targetStatus },
				tmpRenames: [
					[stateTmpAbs, stateFinalAbs] as [string, string],
					[ckptTmpAbs, ckptFinalAbs] as [string, string],
				],
			};
		},
		stagedTmps,
		stagedDirs,
	);

	if (!txResult.ok) {
		if (preconditionRollbackError !== undefined) {
			return { ok: false, error: preconditionRollbackError };
		}
		return { ok: false, error: txResult.error };
	}

	// Best-effort WAL checkpoint (non-critical).
	const warnings: BaseDomainError<unknown>[] = [...txResult.warnings];
	try {
		deps.stores.checkpoint();
	} catch (e) {
		const msg = `checkpoint failed: ${String(e)}`;
		tffWarn(msg);
		warnings.push({
			errorLabel: "PARTIAL_SUCCESS",
			status: 200,
			message: msg,
			context: { pendingEffect: "wal_checkpoint" },
			recoveryHint: undefined,
		} as unknown as BaseDomainError<unknown>);
	}

	return { ok: true, data: { status: txResult.data.status }, warnings };
};
