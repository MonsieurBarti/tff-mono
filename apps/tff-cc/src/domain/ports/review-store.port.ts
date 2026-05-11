import type { DomainError, Result } from "@tff/core";
import type { ReviewRecord, ReviewType } from "../../shared/value-objects/review-record.js";

export type { ReviewRecord, ReviewType };

export interface ReviewStore {
	recordReview(review: ReviewRecord): Result<void, DomainError>;
	getLatestReview(sliceId: string, type: ReviewType): Result<ReviewRecord | null, DomainError>;
	listReviews(sliceId: string): Result<ReviewRecord[], DomainError>;
}
