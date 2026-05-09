/* eslint-disable max-lines */
/* eslint-disable unicorn/no-null */

import { describe, it, expect } from "vitest";
import { Task } from "../../src/domain/task/task.entity.js";
import { TaskCreatedEvent } from "../../src/domain/task/task-created.event.js";
import { TaskClaimedEvent } from "../../src/domain/task/task-claimed.event.js";
import { TaskClosedEvent } from "../../src/domain/task/task-closed.event.js";
import { TaskUnclaimedEvent } from "../../src/domain/task/task-unclaimed.event.js";
import { AlreadyClaimedError, TaskNotFoundError } from "../../src/domain/task/task.error.js";
import { TaskRepository } from "../../src/domain/task/task.repository.js";
import { TASK_TRANSITIONS, type TaskStatus } from "../../src/domain/task/transitions.js";
import { FakeDateProvider } from "../../src/domain/shared/date-provider.js";

describe("Task aggregate root", () => {
	describe("createNew", () => {
		it("creates a task with a generated id", () => {
			const task = Task.createNew({
				sliceId: "slice-1",
				number: 1,
				title: "Test",
			});
			expect(task.id).toBeDefined();
			expect(task.id).toHaveLength(36);
		});

		it("sets sliceId, number, and title", () => {
			const task = Task.createNew({
				sliceId: "slice-1",
				number: 3,
				title: "Build API",
			});
			expect(task.sliceId).toBe("slice-1");
			expect(task.number).toBe(3);
			expect(task.title).toBe("Build API");
		});

		it("sets status to open", () => {
			const task = Task.createNew({
				sliceId: "slice-1",
				number: 1,
				title: "Test",
			});
			expect(task.status).toBe("open");
		});

		it("sets optional description, wave, and difficulty when provided", () => {
			const task = Task.createNew({
				sliceId: "slice-1",
				number: 1,
				title: "Test",
				description: "Desc",
				wave: 2,
				difficulty: 5,
			});
			expect(task.description).toBe("Desc");
			expect(task.wave).toBe(2);
			expect(task.difficulty).toBe(5);
		});

		it("sets description to empty string when omitted", () => {
			const task = Task.createNew({
				sliceId: "slice-1",
				number: 1,
				title: "Test",
			});
			expect(task.description).toBe("");
		});

		it("sets wave and difficulty to null when omitted", () => {
			const task = Task.createNew({
				sliceId: "slice-1",
				number: 1,
				title: "Test",
			});
			expect(task.wave).toBeNull();
			expect(task.difficulty).toBeNull();
		});

		it("sets claimedAt and claimedBy to null", () => {
			const task = Task.createNew({
				sliceId: "slice-1",
				number: 1,
				title: "Test",
			});
			expect(task.claimedAt).toBeNull();
			expect(task.claimedBy).toBeNull();
		});

		it("sets closedReason to null", () => {
			const task = Task.createNew({
				sliceId: "slice-1",
				number: 1,
				title: "Test",
			});
			expect(task.closedReason).toBeNull();
		});

		it("sets createdAt and updatedAt to the current time", () => {
			const before = new Date();
			const task = Task.createNew({
				sliceId: "slice-1",
				number: 1,
				title: "Test",
			});
			const after = new Date();
			expect(task.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(task.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
			expect(task.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(task.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});

		it("emits a TaskCreatedEvent", () => {
			const task = Task.createNew({
				sliceId: "slice-1",
				number: 2,
				title: "Alpha",
			});
			const events = task.pullEvents();
			expect(events).toHaveLength(1);
			expect(events[0]).toBeInstanceOf(TaskCreatedEvent);
			expect(events[0].eventName).toBe("task.created");
			expect(events[0].payload).toEqual({
				taskId: task.id,
				sliceId: "slice-1",
				number: 2,
				title: "Alpha",
			});
		});

		it("throws for an empty sliceId", () => {
			expect(() =>
				Task.createNew({
					sliceId: "",
					number: 1,
					title: "Test",
				}),
			).toThrow();
		});

		it("throws for an empty title", () => {
			expect(() =>
				Task.createNew({
					sliceId: "slice-1",
					number: 1,
					title: "",
				}),
			).toThrow();
		});

		it("throws for a non-positive number", () => {
			expect(() =>
				Task.createNew({
					sliceId: "slice-1",
					number: 0,
					title: "Test",
				}),
			).toThrow();
		});
	});

	describe("reconstruct", () => {
		it("restores state from a plain object", () => {
			const state = {
				id: "task-abc",
				sliceId: "slice-1",
				number: 5,
				title: "Rebuilt",
				description: "Desc",
				status: "in_progress" as TaskStatus,
				wave: 1,
				difficulty: 3,
				claimedAt: new Date("2024-01-01"),
				claimedBy: "user-1",
				closedReason: null,
				createdAt: new Date("2023-12-01"),
				updatedAt: new Date("2024-01-02"),
			};
			const task = Task.reconstruct(state);
			expect(task.id).toBe("task-abc");
			expect(task.sliceId).toBe("slice-1");
			expect(task.number).toBe(5);
			expect(task.title).toBe("Rebuilt");
			expect(task.description).toBe("Desc");
			expect(task.status).toBe("in_progress");
			expect(task.wave).toBe(1);
			expect(task.difficulty).toBe(3);
			expect(task.claimedAt).toEqual(new Date("2024-01-01"));
			expect(task.claimedBy).toBe("user-1");
			expect(task.closedReason).toBeNull();
			expect(task.createdAt).toEqual(new Date("2023-12-01"));
			expect(task.updatedAt).toEqual(new Date("2024-01-02"));
		});
	});

	describe("getters", () => {
		it("isOpen returns true when status is open", () => {
			const task = Task.createNew({ sliceId: "s", number: 1, title: "T" });
			expect(task.isOpen).toBe(true);
			expect(task.isClaimed).toBe(false);
			expect(task.isClosed).toBe(false);
		});

		it("isClaimed returns true when status is in_progress", () => {
			const task = Task.reconstruct({
				id: "t",
				sliceId: "s",
				number: 1,
				title: "T",
				description: "",
				status: "in_progress",
				wave: null,
				difficulty: null,
				claimedAt: new Date(),
				claimedBy: "u",
				closedReason: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			expect(task.isClaimed).toBe(true);
			expect(task.isOpen).toBe(false);
			expect(task.isClosed).toBe(false);
		});

		it("isClosed returns true when status is closed", () => {
			const task = Task.reconstruct({
				id: "t",
				sliceId: "s",
				number: 1,
				title: "T",
				description: "",
				status: "closed",
				wave: null,
				difficulty: null,
				claimedAt: null,
				claimedBy: null,
				closedReason: "done",
				createdAt: new Date(),
				updatedAt: new Date(),
			});
			expect(task.isClosed).toBe(true);
			expect(task.isOpen).toBe(false);
			expect(task.isClaimed).toBe(false);
		});
	});

	describe("rename", () => {
		it("updates the title", () => {
			const task = Task.createNew({ sliceId: "s", number: 1, title: "Old" });
			task.rename("New");
			expect(task.title).toBe("New");
		});

		it("throws for an empty title", () => {
			const task = Task.createNew({ sliceId: "s", number: 1, title: "Old" });
			expect(() => task.rename("")).toThrow();
		});

		it("updates updatedAt", () => {
			const task = Task.createNew({ sliceId: "s", number: 1, title: "Old" });
			const before = task.updatedAt.getTime();
			task.rename("New");
			expect(task.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
		});
	});

	describe("claim", () => {
		it("sets claimedBy and claimedAt", () => {
			const task = Task.createNew({ sliceId: "s", number: 1, title: "T" });
			const dp = new FakeDateProvider(new Date("2024-06-01"));
			task.claim("user-1", dp);
			expect(task.claimedBy).toBe("user-1");
			expect(task.claimedAt).toEqual(new Date("2024-06-01"));
			expect(task.status).toBe("in_progress");
		});

		it("emits a TaskClaimedEvent", () => {
			const task = Task.createNew({ sliceId: "s", number: 1, title: "T" });
			const dp = new FakeDateProvider(new Date("2024-06-01"));
			task.claim("user-1", dp);
			const events = task.pullEvents();
			const claimed = events.find((e) => e instanceof TaskClaimedEvent);
			expect(claimed).toBeDefined();
			expect(claimed?.payload).toEqual({
				taskId: task.id,
				sliceId: "s",
				claimedBy: "user-1",
				claimedAt: "2024-06-01T00:00:00.000Z",
			});
		});

		it("throws AlreadyClaimedError if already claimed", () => {
			const task = Task.createNew({ sliceId: "s", number: 1, title: "T" });
			const dp = new FakeDateProvider(new Date("2024-06-01"));
			task.claim("user-1", dp);
			expect(() => task.claim("user-2", dp)).toThrow(AlreadyClaimedError);
			try {
				task.claim("user-2", dp);
			} catch (error) {
				if (error instanceof AlreadyClaimedError) {
					expect(error.errorLabel).toBe("ALREADY_CLAIMED");
					expect(error.status).toBe(409);
					expect(error.context).toEqual({ taskId: task.id, claimedBy: "user-1" });
				}
			}
		});

		it("updates updatedAt", () => {
			const task = Task.createNew({ sliceId: "s", number: 1, title: "T" });
			task.pullEvents();
			const fakeDate = new Date("2024-06-01");
			const dp = new FakeDateProvider(fakeDate);
			task.claim("user-1", dp);
			expect(task.updatedAt).toEqual(fakeDate);
		});
	});

	describe("close", () => {
		it("sets closedReason and status", () => {
			const task = Task.createNew({ sliceId: "s", number: 1, title: "T" });
			const dp = new FakeDateProvider(new Date("2024-06-02"));
			task.claim("user-1", dp);
			task.close("completed", dp);
			expect(task.closedReason).toBe("completed");
			expect(task.status).toBe("closed");
		});

		it("emits a TaskClosedEvent", () => {
			const task = Task.createNew({ sliceId: "s", number: 1, title: "T" });
			const dp = new FakeDateProvider(new Date("2024-06-02"));
			task.claim("user-1", dp);
			task.close("completed", dp);
			const events = task.pullEvents();
			const closed = events.find((e) => e instanceof TaskClosedEvent);
			expect(closed).toBeDefined();
			expect(closed?.payload).toEqual({
				taskId: task.id,
				sliceId: "s",
				closedReason: "completed",
				closedAt: "2024-06-02T00:00:00.000Z",
			});
		});

		it("updates updatedAt", () => {
			const task = Task.createNew({ sliceId: "s", number: 1, title: "T" });
			const fakeDate = new Date("2024-06-02");
			const dp = new FakeDateProvider(fakeDate);
			task.claim("user-1", dp);
			task.close("completed", dp);
			expect(task.updatedAt).toEqual(fakeDate);
		});
	});

	describe("unclaim", () => {
		it("clears claimedBy and claimedAt and reverts to open", () => {
			const task = Task.createNew({ sliceId: "s", number: 1, title: "T" });
			const dp = new FakeDateProvider(new Date("2024-06-01"));
			task.claim("user-1", dp);
			task.unclaim();
			expect(task.claimedBy).toBeNull();
			expect(task.claimedAt).toBeNull();
			expect(task.status).toBe("open");
		});

		it("emits a TaskUnclaimedEvent", () => {
			const task = Task.createNew({ sliceId: "s", number: 1, title: "T" });
			const dp = new FakeDateProvider(new Date("2024-06-01"));
			task.claim("user-1", dp);
			task.pullEvents();
			task.unclaim();
			const events = task.pullEvents();
			const unclaimed = events.find((e) => e instanceof TaskUnclaimedEvent);
			expect(unclaimed).toBeDefined();
			expect(unclaimed?.payload).toEqual({
				taskId: task.id,
				sliceId: "s",
			});
		});

		it("updates updatedAt", () => {
			const task = Task.createNew({ sliceId: "s", number: 1, title: "T" });
			const dp = new FakeDateProvider(new Date("2024-06-01"));
			task.claim("user-1", dp);
			const before = task.updatedAt.getTime();
			task.unclaim();
			expect(task.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
		});
	});

	describe("TASK_TRANSITIONS", () => {
		it("defines valid transitions", () => {
			expect(TASK_TRANSITIONS.open).toEqual(["in_progress"]);
			expect(TASK_TRANSITIONS.in_progress).toEqual(["closed"]);
			expect(TASK_TRANSITIONS.closed).toEqual([]);
		});
	});

	describe("TaskRepository", () => {
		it("extends RepositoryPort", () => {
			class TestRepo extends TaskRepository {
				save = async (): Promise<void> => {};
				findById = async (): Promise<Task | null> => null;
				findAll = async (): Promise<Task[]> => [];
				delete = async (): Promise<void> => {};
			}
			const repo = new TestRepo();
			expect(repo).toBeDefined();
		});
	});

	describe("TaskNotFoundError", () => {
		it("has correct label and status", () => {
			const error = new TaskNotFoundError("task-123");
			expect(error.errorLabel).toBe("TASK_NOT_FOUND");
			expect(error.status).toBe(404);
			expect(error.context).toEqual({ taskId: "task-123" });
		});
	});
});
