import type { ReviewStore } from "../../domain/ports/review-store.port.js";
import type { ReviewType } from "../../shared/value-objects/review-record.js";
import type { Result } from "@tff/core";
import { type DomainError } from "../../infrastructure/errors/generic-domain-error.js";

interface RecordReviewInput {
	sliceId: string;
	reviewer: string;
	verdict: "approved" | "changes_requested";
	type: ReviewType;
	commitSha: string;
	notes?: string;
}

interface RecordReviewDeps {
	reviewStore: ReviewStore;
}

export const recordReviewUseCase = async (
	input: RecordReviewInput,
	deps: RecordReviewDeps,
): Promise<Result<void, DomainError>> => {
	return deps.reviewStore.recordReview({
		sliceId: input.sliceId,
		reviewer: input.reviewer,
		verdict: input.verdict,
		type: input.type,
		commitSha: input.commitSha,
		notes: input.notes,
		createdAt: new Date().toISOString(),
	});
};
