import { randomUUID } from "node:crypto";

export class TaskUnclaimedEvent {
	readonly id: string;
	readonly eventName = "task.unclaimed";
	readonly payload: {
		taskId: string;
		sliceId: string;
	};
	readonly occurredAt: Date;

	private constructor(payload: { taskId: string; sliceId: string }) {
		this.id = randomUUID();
		this.payload = payload;
		this.occurredAt = new Date();
	}

	static create(payload: { taskId: string; sliceId: string }): TaskUnclaimedEvent {
		return new TaskUnclaimedEvent(payload);
	}
}
