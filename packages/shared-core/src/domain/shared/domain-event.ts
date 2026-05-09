export class DomainEvent<P> {
	readonly eventName: string;
	readonly payload: P;
	readonly occurredAt: Date;

	private constructor(eventName: string, payload: P, occurredAt: Date) {
		this.eventName = eventName;
		this.payload = payload;
		this.occurredAt = occurredAt;
	}

	static create<P>(eventName: string, payload: P): DomainEvent<P> {
		return new DomainEvent(eventName, payload, new Date());
	}
}
