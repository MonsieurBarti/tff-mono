import { randomUUID } from "node:crypto";

export class ReviewRecordedEvent {
	readonly id: string;
	readonly eventName = "review.recorded";
	readonly payload: { reviewId: number; sliceId: string; type: string; reviewer: string };
	readonly occurredAt: Date;

	private constructor(payload: {
		reviewId: number;
		sliceId: string;
		type: string;
		reviewer: string;
	}) {
		this.id = randomUUID();
		this.payload = payload;
		this.occurredAt = new Date();
	}

	static create(payload: {
		reviewId: number;
		sliceId: string;
		type: string;
		reviewer: string;
	}): ReviewRecordedEvent {
		return new ReviewRecordedEvent(payload);
	}
}
