export class ReviewVerdictSetEvent {
	readonly eventName = "review.verdict.set";
	readonly payload: { reviewId: number; sliceId: string; verdict: string };
	readonly occurredAt: Date;

	private constructor(payload: { reviewId: number; sliceId: string; verdict: string }) {
		this.payload = payload;
		this.occurredAt = new Date();
	}

	static create(payload: {
		reviewId: number;
		sliceId: string;
		verdict: string;
	}): ReviewVerdictSetEvent {
		return new ReviewVerdictSetEvent(payload);
	}
}
