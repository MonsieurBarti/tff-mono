import { randomUUID } from "node:crypto";

export class TaskCreatedEvent {
	readonly id: string;
	readonly eventName = "task.created";
	readonly payload: {
		taskId: string;
		sliceId: string;
		number: number;
		title: string;
	};
	readonly occurredAt: Date;

	private constructor(payload: { taskId: string; sliceId: string; number: number; title: string }) {
		this.id = randomUUID();
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
