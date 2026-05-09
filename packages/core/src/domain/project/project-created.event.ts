export class ProjectCreatedEvent {
	readonly eventName = "project.created";
	readonly payload: { projectId: string; name: string };
	readonly occurredAt: Date;

	private constructor(payload: { projectId: string; name: string }) {
		this.payload = payload;
		this.occurredAt = new Date();
	}

	static create(payload: { projectId: string; name: string }): ProjectCreatedEvent {
		return new ProjectCreatedEvent(payload);
	}
}
