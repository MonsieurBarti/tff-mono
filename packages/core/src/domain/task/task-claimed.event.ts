export class TaskClaimedEvent {
	readonly eventName = "task.claimed";
	readonly payload: {
		taskId: string;
		sliceId: string;
		claimedBy: string;
		claimedAt: string;
	};
	readonly occurredAt: Date;

	private constructor(payload: {
		taskId: string;
		sliceId: string;
		claimedBy: string;
		claimedAt: string;
	}) {
		this.payload = payload;
		this.occurredAt = new Date();
	}

	static create(payload: {
		taskId: string;
		sliceId: string;
		claimedBy: string;
		claimedAt: string;
	}): TaskClaimedEvent {
		return new TaskClaimedEvent(payload);
	}
}
