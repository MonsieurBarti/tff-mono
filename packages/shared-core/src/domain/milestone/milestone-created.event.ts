export class MilestoneCreatedEvent {
	readonly eventName = "milestone.created";
	readonly payload: { milestoneId: string; projectId: string; number: number; name: string };
	readonly occurredAt: Date;

	private constructor(payload: {
		milestoneId: string;
		projectId: string;
		number: number;
		name: string;
	}) {
		this.payload = payload;
		this.occurredAt = new Date();
	}

	static create(payload: {
		milestoneId: string;
		projectId: string;
		number: number;
		name: string;
	}): MilestoneCreatedEvent {
		return new MilestoneCreatedEvent(payload);
	}
}
