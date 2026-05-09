export class TaskCreatedEvent {
	readonly eventName = "task.created";
	readonly payload: {
		taskId: string;
		sliceId: string;
		number: number;
		title: string;
	};
	readonly occurredAt: Date;

	private constructor(payload: { taskId: string; sliceId: string; number: number; title: string }) {
		this.payload = payload;
		this.occurredAt = new Date();
	}

	static create(payload: {
		taskId: string;
		sliceId: string;
		number: number;
		title: string;
	}): TaskCreatedEvent {
		return new TaskCreatedEvent(payload);
	}
}
