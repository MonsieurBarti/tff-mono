import type { DomainEvent } from "./domain-event.js";

export abstract class AggregateRoot {
	protected _id: string = "";
	protected _events: DomainEvent<unknown>[] = [];

	addEvent(event: DomainEvent<unknown>): void {
		this._events.push(event);
	}

	pullEvents(): DomainEvent<unknown>[] {
		const events = this._events;
		this._events = [];
		return events;
	}

	get id(): string {
		return this._id;
	}
}
