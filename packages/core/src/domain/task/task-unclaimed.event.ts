export class TaskUnclaimedEvent {
	readonly eventName = "task.unclaimed";
	readonly payload: {
		taskId: string;
		sliceId: string;
	};
	readonly occurredAt: Date;

	private constructor(payload: { taskId: string; sliceId: string }) {
		this.payload = payload;
		this.occurredAt = new Date();
	}

	static create(payload: { taskId: string; sliceId: string }): TaskUnclaimedEvent {
		return new TaskUnclaimedEvent(payload);
	}
}
