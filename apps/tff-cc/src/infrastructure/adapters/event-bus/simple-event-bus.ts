import type { DomainEvent } from "@tff/core";
import type { EventBus } from "../../../domain/ports/event-bus.port.js";

export class SimpleEventBus implements EventBus {
	private handlers = new Map<string, Array<(event: DomainEvent<unknown>) => void>>();

	publish(event: DomainEvent<unknown>): void {
		const handlers = this.handlers.get(event.eventName) ?? [];
		for (const handler of handlers) {
			handler(event);
		}
	}

	subscribe(type: string, handler: (event: DomainEvent<unknown>) => void): void {
		const existing = this.handlers.get(type) ?? [];
		this.handlers.set(type, [...existing, handler]);
	}
}
