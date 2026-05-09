export class ProjectNameUpdatedEvent {
	readonly eventName = "project.name.updated";
	readonly payload: { projectId: string; oldName: string; newName: string };
	readonly occurredAt: Date;

	private constructor(payload: { projectId: string; oldName: string; newName: string }) {
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
