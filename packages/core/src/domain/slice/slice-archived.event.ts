export class SliceArchivedEvent {
	readonly eventName = "slice.archived";
	readonly payload: { sliceId: string; archivedAt: string };
	readonly occurredAt: Date;

	private constructor(payload: { sliceId: string; archivedAt: string }) {
		this.payload = payload;
		this.occurredAt = new Date();
	}

	static create(payload: { sliceId: string; archivedAt: string }): SliceArchivedEvent {
		return new SliceArchivedEvent(payload);
	}
}
