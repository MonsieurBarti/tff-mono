import { randomUUID } from "node:crypto";

export class SliceTierClassifiedEvent {
	readonly id: string;
	readonly eventName = "slice.tier.classified";
	readonly payload: { sliceId: string; tier: string };
	readonly occurredAt: Date;

	private constructor(payload: { sliceId: string; tier: string }) {
		this.id = randomUUID();
		this.payload = payload;
		this.occurredAt = new Date();
	}

	static create(payload: { sliceId: string; tier: string }): SliceTierClassifiedEvent {
		return new SliceTierClassifiedEvent(payload);
	}
}
