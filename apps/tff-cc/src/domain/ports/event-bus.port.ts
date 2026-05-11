import type { DomainEvent } from "@tff/core";

export interface EventBus {
	publish(event: DomainEvent<unknown>): void;
	subscribe(type: string, handler: (event: DomainEvent<unknown>) => void): void;
}
