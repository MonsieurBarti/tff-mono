import type { OutcomeWriter } from "../../domain/ports/outcome-writer.port.js";
import type { KnownDecision } from "../../domain/ports/routing-decision-reader.port.js";
import {
	Err,
	Ok,
	PreconditionViolationError,
	RoutingOutcome,
	type BaseDomainError,
	type OutcomeDimension,
	type OutcomeVerdict,
	type Result,
} from "@tff/core";

export type { KnownDecision };

export interface RecordOutcomeInput {
	decision_id: string;
	dimension: OutcomeDimension;
	verdict: OutcomeVerdict;
	reason?: string;
}

export interface RecordOutcomeDeps {
	writer: OutcomeWriter;
	knownDecisions: KnownDecision[];
	uuid: () => string;
	now: () => string;
}

export const recordOutcomeUseCase = async (
	input: RecordOutcomeInput,
	deps: RecordOutcomeDeps,
): Promise<Result<{ outcome_id: string }, BaseDomainError<unknown>>> => {
	const known = deps.knownDecisions.find((d) => d.decision_id === input.decision_id);
	if (!known) {
		return Err(
			new PreconditionViolationError("Unknown decision_id", [
				`decision_id.unknown: expected known decision_id, actual ${input.decision_id}`,
			]),
		);
	}

	const candidate = {
		outcomeId: deps.uuid(),
		decisionId: input.decision_id,
		dimension: input.dimension,
		verdict: input.verdict,
		source: "manual" as const,
		sliceId: known.slice_id,
		workflowId: known.workflow_id,
		reason: input.reason,
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

	await deps.writer.append(outcome);
	return Ok({ outcome_id: outcome.outcomeId });
};
