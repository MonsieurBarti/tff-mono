import type { DomainEvent } from "./domain-event.js";

export abstract class AggregateRoot {
	protected readonly _id: string;
	protected _events: DomainEvent<unknown>[] = [];

	protected constructor(id: string) {
		this._id = id;
		this._events = [];
	}

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
