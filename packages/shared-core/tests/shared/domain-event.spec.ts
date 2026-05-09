import { describe, it, expect } from "vitest";
import { DomainEvent } from "../../src/domain/shared/domain-event.js";

describe("DomainEvent", () => {
	it("create returns an instance with eventName and payload", () => {
		const event = DomainEvent.create("user.created", { id: "123", name: "Alice" });
		expect(event.eventName).toBe("user.created");
		expect(event.payload).toEqual({ id: "123", name: "Alice" });
	});

	it("preserves payload type", () => {
		const event = DomainEvent.create<number>("count.incremented", 42);
		expect(event.payload).toBe(42);
	});

	it("has an occurredAt timestamp", () => {
		const before = new Date();
		const event = DomainEvent.create("test", {});
		const after = new Date();
		expect(event.occurredAt).toBeInstanceOf(Date);
		expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
		expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
	});
});
