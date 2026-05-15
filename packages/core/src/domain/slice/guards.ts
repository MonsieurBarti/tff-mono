import type { Review } from "./review.entity.js";

export interface GuardResult {
	ok: boolean;
	reason?: string;
}

export function reviewExistsGuard(reviews: readonly Review[]): GuardResult {
	if (reviews.length === 0) {
		return { ok: false, reason: "No review exists on this slice" };
	}
	return { ok: true };
}
