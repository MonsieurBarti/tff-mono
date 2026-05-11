import type { ReviewStore } from "../../domain/ports/review-store.port.js";
import { Err, Ok, isOk, type Result, type TaskStore } from "@tff/core";
import {
	GenericDomainError,
	type DomainError,
} from "../../infrastructure/errors/generic-domain-error.js";

interface EnforceFreshReviewerInput {
	sliceId: string;
	reviewerAgent: string;
}
interface EnforceFreshReviewerDeps {
	taskStore: TaskStore;
	reviewStore: ReviewStore;
}

export const enforceFreshReviewer = async (
	input: EnforceFreshReviewerInput,
	deps: EnforceFreshReviewerDeps,
): Promise<Result<void, DomainError>> => {
	const executorsResult = deps.taskStore.getExecutorsForSlice(input.sliceId);
	if (!isOk(executorsResult)) return executorsResult;
	if (executorsResult.data.includes(input.reviewerAgent))
		return Err(
			new GenericDomainError(
				"FRESH_REVIEWER_VIOLATION",
				`Reviewer "${input.reviewerAgent}" is not fresh for slice "${input.sliceId}".`,
				{ sliceId: input.sliceId, reviewerAgent: input.reviewerAgent },
			),
		);
	return Ok(undefined);
};
