import type { DomainEvent, DomainEventType } from "@tff/core";

export interface EventBus {
	publish(event: DomainEvent): void;
	subscribe(type: DomainEventType, handler: (event: DomainEvent) => void): void;
}
