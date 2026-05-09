import { randomUUID } from "node:crypto";

export class SliceTransitionedEvent {
	readonly id: string;
	readonly eventName = "slice.transitioned";
	readonly payload: {
		sliceId: string;
		from: string;
		to: string;
		triggeredBy?: string;
	};
	readonly occurredAt: Date;

	private constructor(payload: {
		sliceId: string;
		from: string;
		to: string;
		triggeredBy?: string;
	}) {
		this.id = randomUUID();
		this.payload = payload;
		this.occurredAt = new Date();
	}

	static create(payload: {
		sliceId: string;
		from: string;
		to: string;
		triggeredBy?: string;
	}): SliceTransitionedEvent {
		return new SliceTransitionedEvent(payload);
	}
}
