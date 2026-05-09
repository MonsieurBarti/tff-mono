import { describe, it, expect } from "vitest";
import { EventBus } from "../../src/domain/shared/event-bus.js";

describe("EventBus", () => {
	it("can be implemented with publish and subscribe", async () => {
		class FakeEventBus extends EventBus {
			private handlers = new Map<string, ((payload: unknown) => void | Promise<void>)[]>();

			async publish<T>(eventName: string, payload: T): Promise<void> {
				const handlers = this.handlers.get(eventName) ?? [];
				for (const handler of handlers) {
					await handler(payload);
				}
			}

			subscribe<T>(eventName: string, handler: (payload: T) => void | Promise<void>): void {
				const existing = this.handlers.get(eventName) ?? [];
				existing.push(handler as (payload: unknown) => void | Promise<void>);
				this.handlers.set(eventName, existing);
			}
		}

		const bus = new FakeEventBus();
		const received: string[] = [];

		bus.subscribe<string>("greet", (payload) => {
			received.push(payload);
		});

		await bus.publish("greet", "hello");
		expect(received).toEqual(["hello"]);
	});
});
