import { randomUUID } from "node:crypto";

export class MilestoneTransitionedEvent {
	readonly id: string;
	readonly eventName = "milestone.transitioned";
	readonly payload: { milestoneId: string; from: string; to: string };
	readonly occurredAt: Date;

	private constructor(payload: { milestoneId: string; from: string; to: string }) {
		this.id = randomUUID();
		this.payload = payload;
		this.occurredAt = new Date();
	}

	static create(payload: {
		milestoneId: string;
		from: string;
		to: string;
	}): MilestoneTransitionedEvent {
		return new MilestoneTransitionedEvent(payload);
	}
}
