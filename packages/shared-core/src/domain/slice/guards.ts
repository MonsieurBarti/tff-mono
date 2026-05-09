import type { Review } from "./review.entity.js";
import type { ComplexityTier, SliceStatus } from "./transitions.js";

export interface GuardResult {
	ok: boolean;
	reason?: string;
}

export function tierSkipGuard(
	from: SliceStatus,
	to: SliceStatus,
	tier: ComplexityTier | null,
): GuardResult {
	if (tier === "S" && from === "discussing" && to === "planning") {
		return { ok: true };
	}
	return { ok: false, reason: "Tier skip not allowed" };
}

export function reviewExistsGuard(reviews: readonly Review[]): GuardResult {
	if (reviews.length === 0) {
		return { ok: false, reason: "No review exists on this slice" };
	}
	return { ok: true };
}
