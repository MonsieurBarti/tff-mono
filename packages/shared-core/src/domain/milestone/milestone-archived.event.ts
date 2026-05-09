export class MilestoneArchivedEvent {
	readonly eventName = "milestone.archived";
	readonly payload: { milestoneId: string; archivedAt: string };
	readonly occurredAt: Date;

	private constructor(payload: { milestoneId: string; archivedAt: string }) {
		this.payload = payload;
		this.occurredAt = new Date();
	}

	static create(payload: { milestoneId: string; archivedAt: string }): MilestoneArchivedEvent {
		return new MilestoneArchivedEvent(payload);
	}
}
