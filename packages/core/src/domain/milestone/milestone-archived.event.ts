import { randomUUID } from "node:crypto";

export class MilestoneArchivedEvent {
	readonly id: string;
	readonly eventName = "milestone.archived";
	readonly payload: { milestoneId: string; archivedAt: string };
	readonly occurredAt: Date;

	private constructor(payload: { milestoneId: string; archivedAt: string }) {
		this.id = randomUUID();
		this.payload = payload;
		this.occurredAt = new Date();
	}

	static create(payload: { milestoneId: string; archivedAt: string }): MilestoneArchivedEvent {
		return new MilestoneArchivedEvent(payload);
	}
}
