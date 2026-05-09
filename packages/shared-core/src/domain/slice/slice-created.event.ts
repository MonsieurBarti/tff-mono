export class SliceCreatedEvent {
	readonly eventName = "slice.created";
	readonly payload: {
		sliceId: string;
		milestoneId: string | null;
		kind: string;
		number: number;
		title: string;
	};
	readonly occurredAt: Date;

	private constructor(payload: {
		sliceId: string;
		milestoneId: string | null;
		kind: string;
		number: number;
		title: string;
	}) {
		this.payload = payload;
		this.occurredAt = new Date();
	}

	static create(payload: {
		sliceId: string;
		milestoneId: string | null;
		kind: string;
		number: number;
		title: string;
	}): SliceCreatedEvent {
		return new SliceCreatedEvent(payload);
	}
}
