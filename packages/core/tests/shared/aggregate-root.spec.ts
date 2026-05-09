import { describe, it, expect } from "vitest";
import { AggregateRoot } from "../../src/domain/shared/aggregate-root.js";
import { DomainEvent } from "../../src/domain/shared/domain-event.js";

describe("AggregateRoot", () => {
	it("has an id getter", () => {
		class User extends AggregateRoot {
			constructor(id: string) {
				super();
				this._id = id;
			}
		}

		const user = new User("user-1");
		expect(user.id).toBe("user-1");
	});

	it("addEvent stores an event", () => {
		class User extends AggregateRoot {
			constructor(id: string) {
				super();
				this._id = id;
			}
		}

		const user = new User("user-1");
		const event = DomainEvent.create("user.created", { id: "user-1" });
		user.addEvent(event);
		expect(user.pullEvents()).toEqual([event]);
	});

	it("pullEvents returns all events and clears them", () => {
		class User extends AggregateRoot {
			constructor(id: string) {
				super();
				this._id = id;
			}
		}

		const user = new User("user-1");
		const event1 = DomainEvent.create("user.created", { id: "user-1" });
		const event2 = DomainEvent.create("user.updated", { id: "user-1" });
		user.addEvent(event1);
		user.addEvent(event2);

		const firstPull = user.pullEvents();
		expect(firstPull).toHaveLength(2);
		expect(firstPull[0].eventName).toBe("user.created");
		expect(firstPull[1].eventName).toBe("user.updated");

		const secondPull = user.pullEvents();
		expect(secondPull).toHaveLength(0);
	});
});
