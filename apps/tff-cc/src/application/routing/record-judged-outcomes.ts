import {
	type BaseDomainError,
	type JudgeVerdictProps,
	type Result,
	Err,
	Ok,
	PreconditionViolationError,
	JudgeVerdict,
	RoutingOutcome,
	sanitizeReason,
} from "@tff/core";
import type { OutcomeSource } from "../../domain/ports/outcome-source.port.js";
import type { OutcomeWriter } from "../../domain/ports/outcome-writer.port.js";

export interface RecordJudgedOutcomesInput {
	slice_id: string;
	verdicts: unknown; // raw JSON — validated inside
	evidence_truncated: boolean;
}

export interface KnownDecisionRecord {
	decision_id: string;
	slice_id: string;
	workflow_id?: string;
}

export interface RecordJudgedOutcomesDeps {
	sliceStatus: string;
	decisions: KnownDecisionRecord[];
	outcomesSource: OutcomeSource;
	writer: OutcomeWriter;
	modelJudgeEnabled: boolean;
	uuid: () => string;
	now: () => string;
}

export interface RecordJudgedOutcomesResult {
	outcomes_emitted: number;
	skipped: number;
	model_judge_already_had: number;
}

export const recordJudgedOutcomesUseCase = async (
	input: RecordJudgedOutcomesInput,
	deps: RecordJudgedOutcomesDeps,
): Promise<Result<RecordJudgedOutcomesResult, BaseDomainError<unknown>>> => {
	if (!deps.modelJudgeEnabled) {
		return Err(
			new PreconditionViolationError("Precondition violated: model_judge.enabled", [
				"model_judge.enabled: expected true, actual false",
			]),
		);
	}
	if (deps.sliceStatus !== "closed") {
		return Err(
			new PreconditionViolationError("Precondition violated: slice.status", [
				`slice.status: expected closed, actual ${deps.sliceStatus}`,
			]),
		);
	}

	// Validate the verdicts envelope: { verdicts: JudgeVerdict[] }
	const envelope = input.verdicts as { verdicts?: unknown };
	const rawList = envelope?.verdicts;
	if (!Array.isArray(rawList)) {
		return Err(
			new PreconditionViolationError("Precondition violated: verdicts.shape", [
				`verdicts.shape: expected { "verdicts": [] }, actual ${typeof rawList}`,
			]),
		);
	}

	const validated: JudgeVerdict[] = [];
	for (const raw of rawList) {
		try {
			const r = raw as {
				decision_id?: string;
				dimension?: string;
				verdict?: string;
				reason?: string;
			};
			const verdict = JudgeVerdict.create({
				decisionId: r.decision_id ?? "",
				dimension: r.dimension as JudgeVerdictProps["dimension"],
				verdict: r.verdict as JudgeVerdictProps["verdict"],
				reason: r.reason ?? "",
			});
			validated.push(verdict);
		} catch (error) {
			return Err(
				new PreconditionViolationError(error instanceof Error ? error.message : "Invalid verdict", [
					"valid JudgeVerdict",
				]),
			);
		}
	}

	const alreadyJudged = new Set<string>();
	for await (const o of deps.outcomesSource.readOutcomes({ source: "model-judge" })) {
		alreadyJudged.add(o.decision_id);
	}
	const unjudgedIds = new Set(
		deps.decisions.filter((d) => !alreadyJudged.has(d.decision_id)).map((d) => d.decision_id),
	);
	const decisionMap = new Map(deps.decisions.map((d) => [d.decision_id, d]));

	const reasonPrefix = input.evidence_truncated ? "[evidence_truncated] " : "";
	let emitted = 0;
	for (const v of validated) {
		if (!unjudgedIds.has(v.decisionId)) continue;
		const dec = decisionMap.get(v.decisionId);
		if (!dec) continue;
		const cleanReason = sanitizeReason(v.reason) ?? "";
		const candidate = {
			outcomeId: deps.uuid(),
			decisionId: v.decisionId,
			dimension: v.dimension,
			verdict: v.verdict,
			source: "model-judge" as const,
			sliceId: dec.slice_id,
			workflowId: dec.workflow_id ?? "tff:ship",
			reason: `${reasonPrefix}${cleanReason}`,
			emittedAt: deps.now(),
		};
		let outcome: RoutingOutcome;
		try {
			outcome = RoutingOutcome.create(candidate);
		} catch (error) {
			return Err(
				new PreconditionViolationError(
					error instanceof Error ? error.message : "Invalid routing outcome",
					["valid dimension×verdict combination"],
				),
			);
		}
		await deps.writer.append({
			outcome_id: outcome.outcomeId,
			decision_id: outcome.decisionId,
			dimension: outcome.dimension,
			verdict: outcome.verdict,
			source: outcome.source,
			slice_id: outcome.sliceId,
			workflow_id: outcome.workflowId,
			reason: outcome.reason,
			emitted_at: outcome.emittedAt,
		});
		emitted += 1;
	}

	return Ok({
		outcomes_emitted: emitted,
		skipped: deps.decisions.length - unjudgedIds.size,
		model_judge_already_had: alreadyJudged.size,
	});
};
