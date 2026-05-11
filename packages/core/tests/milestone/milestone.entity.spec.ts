import { describe, it, expect } from "vitest";
import { Milestone } from "../../src/domain/milestone/milestone.entity.js";
import { MilestoneCreatedEvent } from "../../src/domain/milestone/milestone-created.event.js";
import { MilestoneTransitionedEvent } from "../../src/domain/milestone/milestone-transitioned.event.js";
import { MilestoneArchivedEvent } from "../../src/domain/milestone/milestone-archived.event.js";
import {
	MilestoneNotFoundError,
	MilestoneAlreadyArchivedError,
	InvalidTransitionError,
} from "../../src/domain/milestone/milestone.error.js";
import { MilestoneRepository } from "../../src/domain/milestone/milestone.repository.js";
import { MILESTONE_TRANSITIONS } from "../../src/domain/milestone/transitions.js";
import { FakeDateProvider } from "../../src/domain/shared/date-provider.js";

describe("Milestone aggregate root", () => {
	describe("createNew", () => {
		it("creates a milestone with a generated id", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			expect(milestone.id).toBeDefined();
			expect(milestone.id).toHaveLength(36);
		});

		it("sets projectId, number, and name", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 2, name: "Alpha" });
			expect(milestone.projectId).toBe("proj-1");
			expect(milestone.number).toBe(2);
			expect(milestone.name).toBe("Alpha");
		});

		it("sets status to created", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			expect(milestone.status).toBe("created");
		});

		it("generates a branch with milestone/<uuid-prefix> format", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			expect(milestone.branch).toMatch(/^milestone\/[a-f0-9]{8}$/);
		});

		it("sets closeReason to null", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			expect(milestone.closeReason).toBeNull();
		});

		it("sets createdAt and updatedAt to the current time", () => {
			const before = new Date();
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			const after = new Date();
			expect(milestone.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(milestone.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
			expect(milestone.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(milestone.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});

		it("sets archivedAt to null", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			expect(milestone.archivedAt).toBeNull();
		});

		it("sets isArchived to false", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			expect(milestone.isArchived).toBe(false);
		});

		it("emits a MilestoneCreatedEvent", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 3, name: "Beta" });
			const events = milestone.pullEvents();
			expect(events).toHaveLength(1);
			expect(events[0]).toBeInstanceOf(MilestoneCreatedEvent);
			expect(events[0].eventName).toBe("milestone.created");
			expect(events[0].payload).toEqual({
				milestoneId: milestone.id,
				projectId: "proj-1",
				number: 3,
				name: "Beta",
			});
		});

		it("throws for an empty projectId", () => {
			expect(() => Milestone.createNew({ projectId: "", number: 1, name: "M1" })).toThrow();
		});

		it("throws for a non-positive number", () => {
			expect(() => Milestone.createNew({ projectId: "proj-1", number: 0, name: "M1" })).toThrow();
		});

		it("throws for an empty name", () => {
			expect(() => Milestone.createNew({ projectId: "proj-1", number: 1, name: "" })).toThrow();
		});
	});

	describe("reconstruct", () => {
		it("reconstructs a milestone from state", () => {
			const state = {
				id: "ms-1",
				projectId: "proj-1",
				number: 1,
				name: "M1",
				status: "in_progress" as const,
				branch: "milestone/abc12345",
				closeReason: "Done",
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-02"),
				archivedAt: new Date("2024-01-03"),
			};
			const milestone = Milestone.reconstruct(state);
			expect(milestone.id).toBe("ms-1");
			expect(milestone.projectId).toBe("proj-1");
			expect(milestone.number).toBe(1);
			expect(milestone.name).toBe("M1");
			expect(milestone.status).toBe("in_progress");
			expect(milestone.branch).toBe("milestone/abc12345");
			expect(milestone.closeReason).toBe("Done");
			expect(milestone.createdAt).toEqual(new Date("2024-01-01"));
			expect(milestone.updatedAt).toEqual(new Date("2024-01-02"));
			expect(milestone.archivedAt).toEqual(new Date("2024-01-03"));
			expect(milestone.isArchived).toBe(true);
		});

		it("does not emit events on reconstruct", () => {
			const state = {
				id: "ms-1",
				projectId: "proj-1",
				number: 1,
				name: "M1",
				status: "created" as const,
				branch: "milestone/abc12345",
				closeReason: null,
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-02"),
				archivedAt: null,
			};
			const milestone = Milestone.reconstruct(state);
			expect(milestone.pullEvents()).toHaveLength(0);
		});
	});

	describe("rename", () => {
		it("updates the name", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "Old" });
			milestone.pullEvents();
			milestone.rename("New");
			expect(milestone.name).toBe("New");
		});

		it("throws for an empty name", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "Old" });
			expect(() => milestone.rename("")).toThrow();
		});

		it("updates updatedAt", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "Old" });
			const before = new Date();
			milestone.pullEvents();
			milestone.rename("New");
			const after = new Date();
			expect(milestone.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(milestone.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});
	});

	describe("transition", () => {
		it("transitions from created to in_progress", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			milestone.pullEvents();
			milestone.transition("in_progress");
			expect(milestone.status).toBe("in_progress");
		});

		it("transitions from in_progress to completing", () => {
			const state = {
				id: "ms-1",
				projectId: "proj-1",
				number: 1,
				name: "M1",
				status: "in_progress" as const,
				branch: "milestone/abc12345",
				closeReason: null,
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-02"),
				archivedAt: null,
			};
			const milestone = Milestone.reconstruct(state);
			milestone.transition("completing");
			expect(milestone.status).toBe("completing");
		});

		it("transitions from completing to closed", () => {
			const state = {
				id: "ms-1",
				projectId: "proj-1",
				number: 1,
				name: "M1",
				status: "completing" as const,
				branch: "milestone/abc12345",
				closeReason: null,
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-02"),
				archivedAt: null,
			};
			const milestone = Milestone.reconstruct(state);
			milestone.transition("closed");
			expect(milestone.status).toBe("closed");
		});

		it("throws InvalidTransitionError for an invalid transition", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			expect(() => milestone.transition("closed")).toThrow(InvalidTransitionError);
		});

		it("emits a MilestoneTransitionedEvent", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			milestone.pullEvents();
			milestone.transition("in_progress");
			const events = milestone.pullEvents();
			expect(events).toHaveLength(1);
			expect(events[0]).toBeInstanceOf(MilestoneTransitionedEvent);
			expect(events[0].eventName).toBe("milestone.transitioned");
			expect(events[0].payload).toEqual({
				milestoneId: milestone.id,
				from: "created",
				to: "in_progress",
			});
		});

		it("updates updatedAt on transition", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			const before = new Date();
			milestone.pullEvents();
			milestone.transition("in_progress");
			const after = new Date();
			expect(milestone.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(milestone.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});
	});

	describe("archive", () => {
		it("sets archivedAt using the date provider", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			milestone.pullEvents();
			const fakeDate = new Date("2025-06-01");
			const dateProvider = new FakeDateProvider(fakeDate);
			milestone.archive(dateProvider);
			expect(milestone.archivedAt).toEqual(fakeDate);
			expect(milestone.isArchived).toBe(true);
		});

		it("emits a MilestoneArchivedEvent with ISO string", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			milestone.pullEvents();
			const fakeDate = new Date("2025-06-01");
			const dateProvider = new FakeDateProvider(fakeDate);
			milestone.archive(dateProvider);
			const events = milestone.pullEvents();
			expect(events).toHaveLength(1);
			expect(events[0]).toBeInstanceOf(MilestoneArchivedEvent);
			expect(events[0].eventName).toBe("milestone.archived");
			expect(events[0].payload).toEqual({
				milestoneId: milestone.id,
				archivedAt: fakeDate.toISOString(),
			});
		});

		it("throws MilestoneAlreadyArchivedError if already archived", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			const dateProvider = new FakeDateProvider(new Date("2025-06-01"));
			milestone.archive(dateProvider);
			expect(() => milestone.archive(dateProvider)).toThrow(MilestoneAlreadyArchivedError);
		});

		it("updates updatedAt on archive", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			milestone.pullEvents();
			const fakeDate = new Date("2025-06-01");
			const dateProvider = new FakeDateProvider(fakeDate);
			milestone.archive(dateProvider);
			expect(milestone.updatedAt).toEqual(fakeDate);
		});
	});

	describe("archived immutability", () => {
		it("throws when renaming an archived milestone", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			const dp = new FakeDateProvider(new Date("2025-06-01"));
			milestone.archive(dp);
			expect(() => milestone.rename("New")).toThrow(MilestoneAlreadyArchivedError);
		});

		it("throws when transitioning an archived milestone", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			const dp = new FakeDateProvider(new Date("2025-06-01"));
			milestone.archive(dp);
			expect(() => milestone.transition("in_progress")).toThrow(MilestoneAlreadyArchivedError);
		});

		it("throws when setting close reason on an archived milestone", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			const dp = new FakeDateProvider(new Date("2025-06-01"));
			milestone.archive(dp);
			expect(() => milestone.setCloseReason("Shipped")).toThrow(MilestoneAlreadyArchivedError);
		});
	});

	describe("setCloseReason", () => {
		it("sets the close reason", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			milestone.pullEvents();
			milestone.setCloseReason("Shipped");
			expect(milestone.closeReason).toBe("Shipped");
		});

		it("throws for an empty close reason", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			expect(() => milestone.setCloseReason("")).toThrow();
		});

		it("updates updatedAt", () => {
			const milestone = Milestone.createNew({ projectId: "proj-1", number: 1, name: "M1" });
			const before = new Date();
			milestone.pullEvents();
			milestone.setCloseReason("Shipped");
			const after = new Date();
			expect(milestone.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(milestone.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});
	});
});

describe("MilestoneCreatedEvent", () => {
	it("has the correct eventName and payload", () => {
		const event = MilestoneCreatedEvent.create({
			milestoneId: "ms-1",
			projectId: "proj-1",
			number: 1,
			name: "M1",
		});
		expect(event.eventName).toBe("milestone.created");
		expect(event.payload).toEqual({
			milestoneId: "ms-1",
			projectId: "proj-1",
			number: 1,
			name: "M1",
		});
	});
});

describe("MilestoneTransitionedEvent", () => {
	it("has the correct eventName and payload", () => {
		const event = MilestoneTransitionedEvent.create({
			milestoneId: "ms-1",
			from: "created",
			to: "in_progress",
		});
		expect(event.eventName).toBe("milestone.transitioned");
		expect(event.payload).toEqual({ milestoneId: "ms-1", from: "created", to: "in_progress" });
	});
});

describe("MilestoneArchivedEvent", () => {
	it("has the correct eventName and payload", () => {
		const event = MilestoneArchivedEvent.create({
			milestoneId: "ms-1",
			archivedAt: "2025-06-01T00:00:00.000Z",
		});
		expect(event.eventName).toBe("milestone.archived");
		expect(event.payload).toEqual({ milestoneId: "ms-1", archivedAt: "2025-06-01T00:00:00.000Z" });
	});
});

describe("MilestoneNotFoundError", () => {
	it("has the correct label, status, and message", () => {
		const error = new MilestoneNotFoundError("Milestone ms-1 not found", "ms-1");
		expect(error.errorLabel).toBe("MILESTONE_NOT_FOUND");
		expect(error.status).toBe(404);
		expect(error.context).toEqual({ milestoneId: "ms-1" });
		expect(error.message).toBe("Milestone ms-1 not found");
	});
});

describe("MilestoneAlreadyArchivedError", () => {
	it("has the correct label, status, and message", () => {
		const error = new MilestoneAlreadyArchivedError("Milestone is already archived", "ms-1");
		expect(error.errorLabel).toBe("MILESTONE_ALREADY_ARCHIVED");
		expect(error.status).toBe(409);
		expect(error.context).toEqual({ milestoneId: "ms-1" });
		expect(error.message).toBe("Milestone is already archived");
	});
});

describe("InvalidTransitionError", () => {
	it("has the correct label, status, and message", () => {
		const error = new InvalidTransitionError(
			"Invalid transition from created to closed",
			"created",
			"closed",
			["in_progress"],
		);
		expect(error.errorLabel).toBe("INVALID_TRANSITION");
		expect(error.status).toBe(409);
		expect(error.context).toEqual({ from: "created", to: "closed", expected: ["in_progress"] });
		expect(error.message).toBe("Invalid transition from created to closed");
	});
});

describe("MilestoneRepository", () => {
	it("is an abstract class extending RepositoryPort", () => {
		expect(typeof MilestoneRepository).toBe("function");
		expect(Object.getPrototypeOf(MilestoneRepository).name).toBe("RepositoryPort");
	});
});

describe("MILESTONE_TRANSITIONS", () => {
	it("defines the correct allowed transitions", () => {
		expect(MILESTONE_TRANSITIONS.created).toEqual(["in_progress"]);
		expect(MILESTONE_TRANSITIONS.in_progress).toEqual(["completing"]);
		expect(MILESTONE_TRANSITIONS.completing).toEqual(["closed"]);
		expect(MILESTONE_TRANSITIONS.closed).toEqual([]);
	});
});
