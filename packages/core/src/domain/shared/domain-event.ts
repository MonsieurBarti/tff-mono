import { randomUUID } from "node:crypto";

export class DomainEvent<P> {
	readonly id: string;
	readonly eventName: string;
	readonly payload: P;
	readonly occurredAt: Date;

	private constructor(id: string, eventName: string, payload: P, occurredAt: Date) {
		this.id = id;
		this.eventName = eventName;
		this.payload = payload;
		this.occurredAt = occurredAt;
	}

	static create<P>(eventName: string, payload: P): DomainEvent<P> {
		return new DomainEvent(randomUUID(), eventName, payload, new Date());
	}
}
