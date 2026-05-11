import type { ReviewStore } from "../../domain/ports/review-store.port.js";
import {
	Err,
	Ok,
	freshReviewerViolationError,
	isOk,
	type DomainError,
	type Result,
	type TaskStore,
} from "@tff/core";

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
		return Err(freshReviewerViolationError(input.sliceId, input.reviewerAgent));
	return Ok(undefined);
};
