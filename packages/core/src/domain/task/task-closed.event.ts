import { randomUUID } from "node:crypto";

export class TaskClosedEvent {
	readonly id: string;
	readonly eventName = "task.closed";
	readonly payload: {
		taskId: string;
		sliceId: string;
		closedReason: string;
		closedAt: string;
	};
	readonly occurredAt: Date;

	private constructor(payload: {
		taskId: string;
		sliceId: string;
		closedReason: string;
		closedAt: string;
	}) {
		this.id = randomUUID();
		this.payload = payload;
		this.occurredAt = new Date();
	}

	static create(payload: {
		taskId: string;
		sliceId: string;
		closedReason: string;
		closedAt: string;
	}): TaskClosedEvent {
		return new TaskClosedEvent(payload);
	}
}
