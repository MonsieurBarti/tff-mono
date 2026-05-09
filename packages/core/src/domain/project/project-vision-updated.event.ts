import { randomUUID } from "node:crypto";

export class ProjectVisionUpdatedEvent {
	readonly id: string;
	readonly eventName = "project.vision.updated";
	readonly payload: { projectId: string; oldVision: string; newVision: string };
	readonly occurredAt: Date;

	private constructor(payload: { projectId: string; oldVision: string; newVision: string }) {
		this.id = randomUUID();
		this.payload = payload;
		this.occurredAt = new Date();
	}

	static create(payload: {
		projectId: string;
		oldVision: string;
		newVision: string;
	}): ProjectVisionUpdatedEvent {
		return new ProjectVisionUpdatedEvent(payload);
	}
}
