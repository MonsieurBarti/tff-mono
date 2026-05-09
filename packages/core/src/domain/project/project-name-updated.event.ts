import { randomUUID } from "node:crypto";

export class ProjectNameUpdatedEvent {
	readonly id: string;
	readonly eventName = "project.name.updated";
	readonly payload: { projectId: string; oldName: string; newName: string };
	readonly occurredAt: Date;

	private constructor(payload: { projectId: string; oldName: string; newName: string }) {
		this.id = randomUUID();
		this.payload = payload;
		this.occurredAt = new Date();
	}

	static create(payload: {
		projectId: string;
		oldName: string;
		newName: string;
	}): ProjectNameUpdatedEvent {
		return new ProjectNameUpdatedEvent(payload);
	}
}
