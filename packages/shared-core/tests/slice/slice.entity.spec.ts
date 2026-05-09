/* eslint-disable max-lines */
/* eslint-disable unicorn/no-null */

import { describe, it, expect } from "vitest";
import { Slice } from "../../src/domain/slice/slice.entity.js";
import { SliceCreatedEvent } from "../../src/domain/slice/slice-created.event.js";
import { SliceTransitionedEvent } from "../../src/domain/slice/slice-transitioned.event.js";
import { SliceTierClassifiedEvent } from "../../src/domain/slice/slice-tier-classified.event.js";
import { SliceArchivedEvent } from "../../src/domain/slice/slice-archived.event.js";
import { ReviewRecordedEvent } from "../../src/domain/slice/review-recorded.event.js";
import { ReviewVerdictSetEvent } from "../../src/domain/slice/review-verdict-set.event.js";
import {
	InvalidTransitionError,
	TierClassificationError,
	SliceNotFoundError,
	SliceAlreadyArchivedError,
	PreconditionViolationError,
} from "../../src/domain/slice/slice.error.js";
import { SliceRepository } from "../../src/domain/slice/slice.repository.js";
import { SLICE_TRANSITIONS, type SliceStatus } from "../../src/domain/slice/transitions.js";
import { FakeDateProvider } from "../../src/domain/shared/date-provider.js";

describe("Slice aggregate root", () => {
	describe("createNew", () => {
		it("creates a slice with a generated id", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			expect(slice.id).toBeDefined();
			expect(slice.id).toHaveLength(36);
		});

		it("sets milestoneId, kind, number, title, and baseBranch", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "quick",
				number: 3,
				title: "Quick fix",
				baseBranch: "dev",
			});
			expect(slice.milestoneId).toBe("ms-1");
			expect(slice.kind).toBe("quick");
			expect(slice.number).toBe(3);
			expect(slice.title).toBe("Quick fix");
			expect(slice.baseBranch).toBe("dev");
		});

		it("allows null milestoneId", () => {
			const slice = Slice.createNew({
				milestoneId: null,
				kind: "debug",
				number: 1,
				title: "Debug",
				baseBranch: "main",
			});
			expect(slice.milestoneId).toBeNull();
		});

		it("sets status to created", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			expect(slice.status).toBe("created");
		});

		it("sets tier to null", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			expect(slice.tier).toBeNull();
		});

		it("generates branchName from kind and number", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 255,
				title: "Test",
				baseBranch: "main",
			});
			expect(slice.branchName).toBe("slice/000000ff");
		});

		it("sets createdAt and updatedAt to the current time", () => {
			const before = new Date();
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			const after = new Date();
			expect(slice.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(slice.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
			expect(slice.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(slice.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});

		it("sets archivedAt to null", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			expect(slice.archivedAt).toBeNull();
		});

		it("sets isArchived to false", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			expect(slice.isArchived).toBe(false);
		});

		it("initializes reviews to empty array", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			expect(slice.reviews).toEqual([]);
		});

		it("emits a SliceCreatedEvent", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 2,
				title: "Alpha",
				baseBranch: "main",
			});
			const events = slice.pullEvents();
			expect(events).toHaveLength(1);
			expect(events[0]).toBeInstanceOf(SliceCreatedEvent);
			expect(events[0].eventName).toBe("slice.created");
			expect(events[0].payload).toEqual({
				sliceId: slice.id,
				milestoneId: "ms-1",
				kind: "milestone",
				number: 2,
				title: "Alpha",
			});
		});

		it("throws for an empty title", () => {
			expect(() =>
				Slice.createNew({
					milestoneId: "ms-1",
					kind: "milestone",
					number: 1,
					title: "",
					baseBranch: "main",
				}),
			).toThrow();
		});

		it("throws for a non-positive number", () => {
			expect(() =>
				Slice.createNew({
					milestoneId: "ms-1",
					kind: "milestone",
					number: 0,
					title: "Test",
					baseBranch: "main",
				}),
			).toThrow();
		});

		it("throws for an empty baseBranch", () => {
			expect(() =>
				Slice.createNew({
					milestoneId: "ms-1",
					kind: "milestone",
					number: 1,
					title: "Test",
					baseBranch: "",
				}),
			).toThrow();
		});
	});

	describe("reconstruct", () => {
		it("reconstructs a slice from state", () => {
			const state = {
				id: "sl-1",
				milestoneId: "ms-1",
				kind: "milestone" as const,
				number: 1,
				title: "Test",
				status: "executing" as SliceStatus,
				tier: "S" as const,
				baseBranch: "main",
				branchName: "slice/00000001",
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-02"),
				archivedAt: null as Date | null,
			};
			const slice = Slice.reconstruct(state);
			expect(slice.id).toBe("sl-1");
			expect(slice.milestoneId).toBe("ms-1");
			expect(slice.kind).toBe("milestone");
			expect(slice.number).toBe(1);
			expect(slice.title).toBe("Test");
			expect(slice.status).toBe("executing");
			expect(slice.tier).toBe("S");
			expect(slice.baseBranch).toBe("main");
			expect(slice.branchName).toBe("slice/00000001");
			expect(slice.createdAt).toEqual(new Date("2024-01-01"));
			expect(slice.updatedAt).toEqual(new Date("2024-01-02"));
			expect(slice.archivedAt).toBeNull();
			expect(slice.isArchived).toBe(false);
		});

		it("reconstructs with reviews", () => {
			const reviewState = {
				id: 1,
				sliceId: "sl-1",
				type: "code",
				reviewer: "agent",
				verdict: "approved" as const,
				commitSha: "abc123",
				notes: "lgtm",
				createdAt: new Date("2024-01-01"),
			};
			const slice = Slice.reconstruct({
				id: "sl-1",
				milestoneId: "ms-1",
				kind: "milestone" as const,
				number: 1,
				title: "Test",
				status: "executing" as SliceStatus,
				tier: null,
				baseBranch: "main",
				branchName: "slice/00000001",
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-02"),
				archivedAt: null,
				reviews: [reviewState],
			});
			expect(slice.reviews).toHaveLength(1);
			expect(slice.reviews[0].id).toBe(1);
			expect(slice.reviews[0].verdict).toBe("approved");
		});

		it("does not emit events on reconstruct", () => {
			const slice = Slice.reconstruct({
				id: "sl-1",
				milestoneId: "ms-1",
				kind: "milestone" as const,
				number: 1,
				title: "Test",
				status: "created" as SliceStatus,
				tier: null,
				baseBranch: "main",
				branchName: "slice/00000001",
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-02"),
				archivedAt: null,
			});
			expect(slice.pullEvents()).toHaveLength(0);
		});
	});

	describe("rename", () => {
		it("updates the title", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Old",
				baseBranch: "main",
			});
			slice.pullEvents();
			slice.rename("New");
			expect(slice.title).toBe("New");
		});

		it("throws for an empty title", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Old",
				baseBranch: "main",
			});
			expect(() => slice.rename("")).toThrow();
		});

		it("updates updatedAt", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Old",
				baseBranch: "main",
			});
			const before = new Date();
			slice.pullEvents();
			slice.rename("New");
			const after = new Date();
			expect(slice.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(slice.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});
	});

	describe("transition", () => {
		it("transitions along valid paths", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			slice.pullEvents();
			slice.transition("discussing");
			expect(slice.status).toBe("discussing");
			slice.transition("researching");
			expect(slice.status).toBe("researching");
			slice.transition("planning");
			expect(slice.status).toBe("planning");
			slice.transition("executing");
			expect(slice.status).toBe("executing");
			slice.transition("verifying");
			expect(slice.status).toBe("verifying");
		});

		it("allows planning self-loop", () => {
			const slice = Slice.reconstruct({
				id: "sl-1",
				milestoneId: "ms-1",
				kind: "milestone" as const,
				number: 1,
				title: "Test",
				status: "planning" as SliceStatus,
				tier: null,
				baseBranch: "main",
				branchName: "slice/00000001",
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-02"),
				archivedAt: null,
			});
			slice.transition("planning");
			expect(slice.status).toBe("planning");
		});

		it("allows verifying back to executing", () => {
			const slice = Slice.reconstruct({
				id: "sl-1",
				milestoneId: "ms-1",
				kind: "milestone" as const,
				number: 1,
				title: "Test",
				status: "verifying" as SliceStatus,
				tier: null,
				baseBranch: "main",
				branchName: "slice/00000001",
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-02"),
				archivedAt: null,
			});
			slice.transition("executing");
			expect(slice.status).toBe("executing");
		});

		it("allows reviewing back to executing", () => {
			const slice = Slice.reconstruct({
				id: "sl-1",
				milestoneId: "ms-1",
				kind: "milestone" as const,
				number: 1,
				title: "Test",
				status: "reviewing" as SliceStatus,
				tier: null,
				baseBranch: "main",
				branchName: "slice/00000001",
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-02"),
				archivedAt: null,
			});
			slice.transition("executing");
			expect(slice.status).toBe("executing");
		});

		it("throws InvalidTransitionError for an invalid transition", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			expect(() => slice.transition("closed")).toThrow(InvalidTransitionError);
		});

		it("emits a SliceTransitionedEvent", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			slice.pullEvents();
			slice.transition("discussing");
			const events = slice.pullEvents();
			expect(events).toHaveLength(1);
			expect(events[0]).toBeInstanceOf(SliceTransitionedEvent);
			expect(events[0].eventName).toBe("slice.transitioned");
			expect(events[0].payload).toEqual({
				sliceId: slice.id,
				from: "created",
				to: "discussing",
			});
		});

		it("updates updatedAt on transition", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			const before = new Date();
			slice.pullEvents();
			slice.transition("discussing");
			const after = new Date();
			expect(slice.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(slice.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});

		it("includes triggeredBy in payload when actor provided", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			slice.pullEvents();
			slice.transition("discussing", { actor: "agent-1" });
			const events = slice.pullEvents();
			expect(events[0].payload).toEqual({
				sliceId: slice.id,
				from: "created",
				to: "discussing",
				triggeredBy: "agent-1",
			});
		});

		it("throws PreconditionViolationError when verifying→reviewing without reviews", () => {
			const slice = Slice.reconstruct({
				id: "sl-1",
				milestoneId: "ms-1",
				kind: "milestone" as const,
				number: 1,
				title: "Test",
				status: "verifying" as SliceStatus,
				tier: null,
				baseBranch: "main",
				branchName: "slice/00000001",
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-02"),
				archivedAt: null,
			});
			expect(() => slice.transition("reviewing")).toThrow(PreconditionViolationError);
		});

		it("allows verifying→reviewing when reviews exist", () => {
			const slice = Slice.reconstruct({
				id: "sl-1",
				milestoneId: "ms-1",
				kind: "milestone" as const,
				number: 1,
				title: "Test",
				status: "verifying" as SliceStatus,
				tier: null,
				baseBranch: "main",
				branchName: "slice/00000001",
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-02"),
				archivedAt: null,
				reviews: [
					{
						id: 1,
						sliceId: "sl-1",
						type: "code",
						reviewer: "agent",
						verdict: null,
						commitSha: null,
						notes: null,
						createdAt: new Date("2024-01-01"),
					},
				],
			});
			slice.transition("reviewing");
			expect(slice.status).toBe("reviewing");
		});
	});

	describe("classifyTier", () => {
		it("sets the tier", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			slice.classifyTier("S");
			expect(slice.tier).toBe("S");
		});

		it("emits a SliceTierClassifiedEvent", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			slice.pullEvents();
			slice.classifyTier("SS");
			const events = slice.pullEvents();
			expect(events).toHaveLength(1);
			expect(events[0]).toBeInstanceOf(SliceTierClassifiedEvent);
			expect(events[0].eventName).toBe("slice.tier.classified");
			expect(events[0].payload).toEqual({ sliceId: slice.id, tier: "SS" });
		});

		it("throws TierClassificationError for invalid tier", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			expect(() => slice.classifyTier("X" as "S")).toThrow(TierClassificationError);
		});
	});

	describe("archive", () => {
		it("sets archivedAt using the date provider", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			slice.pullEvents();
			const fakeDate = new Date("2025-06-01");
			const dateProvider = new FakeDateProvider(fakeDate);
			slice.archive(dateProvider);
			expect(slice.archivedAt).toEqual(fakeDate);
			expect(slice.isArchived).toBe(true);
		});

		it("emits a SliceArchivedEvent with ISO string", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			slice.pullEvents();
			const fakeDate = new Date("2025-06-01");
			const dateProvider = new FakeDateProvider(fakeDate);
			slice.archive(dateProvider);
			const events = slice.pullEvents();
			expect(events).toHaveLength(1);
			expect(events[0]).toBeInstanceOf(SliceArchivedEvent);
			expect(events[0].eventName).toBe("slice.archived");
			expect(events[0].payload).toEqual({
				sliceId: slice.id,
				archivedAt: fakeDate.toISOString(),
			});
		});

		it("throws SliceAlreadyArchivedError if already archived", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			const dateProvider = new FakeDateProvider(new Date("2025-06-01"));
			slice.archive(dateProvider);
			expect(() => slice.archive(dateProvider)).toThrow(SliceAlreadyArchivedError);
		});

		it("updates updatedAt on archive", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			slice.pullEvents();
			const fakeDate = new Date("2025-06-01");
			const dateProvider = new FakeDateProvider(fakeDate);
			slice.archive(dateProvider);
			expect(slice.updatedAt).toEqual(fakeDate);
		});
	});

	describe("recordReview", () => {
		it("adds a review to the slice", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			slice.recordReview({ type: "code", reviewer: "agent" });
			expect(slice.reviews).toHaveLength(1);
			expect(slice.reviews[0].sliceId).toBe(slice.id);
			expect(slice.reviews[0].type).toBe("code");
			expect(slice.reviews[0].reviewer).toBe("agent");
		});

		it("emits a ReviewRecordedEvent", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			slice.pullEvents();
			slice.recordReview({
				type: "security",
				reviewer: "human",
				commitSha: "abc123",
				notes: "lgtm",
			});
			const events = slice.pullEvents();
			expect(events).toHaveLength(1);
			expect(events[0]).toBeInstanceOf(ReviewRecordedEvent);
			expect(events[0].eventName).toBe("review.recorded");
			expect(events[0].payload).toEqual({
				reviewId: 0,
				sliceId: slice.id,
				type: "security",
				reviewer: "human",
			});
		});
	});

	describe("setReviewVerdict", () => {
		it("sets the verdict on the matching review", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			slice.recordReview({ type: "code", reviewer: "agent" });
			const reviewId = slice.reviews[0].id;
			slice.setReviewVerdict(reviewId, "approved");
			expect(slice.reviews[0].verdict).toBe("approved");
		});

		it("emits a ReviewVerdictSetEvent", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			slice.recordReview({ type: "code", reviewer: "agent" });
			const reviewId = slice.reviews[0].id;
			slice.pullEvents();
			slice.setReviewVerdict(reviewId, "changes_requested");
			const events = slice.pullEvents();
			expect(events).toHaveLength(1);
			expect(events[0]).toBeInstanceOf(ReviewVerdictSetEvent);
			expect(events[0].eventName).toBe("review.verdict.set");
			expect(events[0].payload).toEqual({
				reviewId,
				sliceId: slice.id,
				verdict: "changes_requested",
			});
		});

		it("throws when review id is not found", () => {
			const slice = Slice.createNew({
				milestoneId: "ms-1",
				kind: "milestone",
				number: 1,
				title: "Test",
				baseBranch: "main",
			});
			expect(() => slice.setReviewVerdict(99, "approved")).toThrow();
		});
	});
});

describe("SliceCreatedEvent", () => {
	it("has the correct eventName and payload", () => {
		const event = SliceCreatedEvent.create({
			sliceId: "sl-1",
			milestoneId: "ms-1",
			kind: "milestone",
			number: 1,
			title: "Test",
		});
		expect(event.eventName).toBe("slice.created");
		expect(event.payload).toEqual({
			sliceId: "sl-1",
			milestoneId: "ms-1",
			kind: "milestone",
			number: 1,
			title: "Test",
		});
	});
});

describe("SliceTransitionedEvent", () => {
	it("has the correct eventName and payload", () => {
		const event = SliceTransitionedEvent.create({
			sliceId: "sl-1",
			from: "created",
			to: "discussing",
		});
		expect(event.eventName).toBe("slice.transitioned");
		expect(event.payload).toEqual({ sliceId: "sl-1", from: "created", to: "discussing" });
	});

	it("includes triggeredBy when provided", () => {
		const event = SliceTransitionedEvent.create({
			sliceId: "sl-1",
			from: "created",
			to: "discussing",
			triggeredBy: "agent",
		});
		expect(event.payload.triggeredBy).toBe("agent");
	});
});

describe("SliceTierClassifiedEvent", () => {
	it("has the correct eventName and payload", () => {
		const event = SliceTierClassifiedEvent.create({ sliceId: "sl-1", tier: "S" });
		expect(event.eventName).toBe("slice.tier.classified");
		expect(event.payload).toEqual({ sliceId: "sl-1", tier: "S" });
	});
});

describe("SliceArchivedEvent", () => {
	it("has the correct eventName and payload", () => {
		const event = SliceArchivedEvent.create({
			sliceId: "sl-1",
			archivedAt: "2025-06-01T00:00:00.000Z",
		});
		expect(event.eventName).toBe("slice.archived");
		expect(event.payload).toEqual({ sliceId: "sl-1", archivedAt: "2025-06-01T00:00:00.000Z" });
	});
});

describe("Slice errors", () => {
	it("InvalidTransitionError has correct label and status", () => {
		const error = new InvalidTransitionError("created", "closed", ["discussing"]);
		expect(error.errorLabel).toBe("INVALID_TRANSITION");
		expect(error.status).toBe(409);
		expect(error.context).toEqual({ from: "created", to: "closed", expected: ["discussing"] });
	});

	it("TierClassificationError has correct label and status", () => {
		const error = new TierClassificationError("X", "Invalid tier value");
		expect(error.errorLabel).toBe("TIER_CLASSIFICATION_INVALID");
		expect(error.status).toBe(400);
		expect(error.context).toEqual({ tier: "X", reason: "Invalid tier value" });
	});

	it("SliceNotFoundError has correct label and status", () => {
		const error = new SliceNotFoundError("sl-1");
		expect(error.errorLabel).toBe("SLICE_NOT_FOUND");
		expect(error.status).toBe(404);
		expect(error.context).toEqual({ sliceId: "sl-1" });
	});

	it("SliceAlreadyArchivedError has correct label and status", () => {
		const error = new SliceAlreadyArchivedError("sl-1");
		expect(error.errorLabel).toBe("SLICE_ALREADY_ARCHIVED");
		expect(error.status).toBe(409);
		expect(error.context).toEqual({ sliceId: "sl-1" });
	});

	it("PreconditionViolationError has correct label and status", () => {
		const error = new PreconditionViolationError(["No review exists on this slice"]);
		expect(error.errorLabel).toBe("PRECONDITION_VIOLATION");
		expect(error.status).toBe(422);
		expect(error.context).toEqual({ preconditions: ["No review exists on this slice"] });
	});
});

describe("SliceRepository", () => {
	it("is an abstract class extending RepositoryPort", () => {
		expect(typeof SliceRepository).toBe("function");
		expect(Object.getPrototypeOf(SliceRepository).name).toBe("RepositoryPort");
	});
});

describe("SLICE_TRANSITIONS", () => {
	it("defines the correct allowed transitions", () => {
		expect(SLICE_TRANSITIONS.created).toEqual(["discussing"]);
		expect(SLICE_TRANSITIONS.discussing).toEqual(["researching", "planning"]);
		expect(SLICE_TRANSITIONS.researching).toEqual(["planning"]);
		expect(SLICE_TRANSITIONS.planning).toEqual(["planning", "executing"]);
		expect(SLICE_TRANSITIONS.executing).toEqual(["verifying"]);
		expect(SLICE_TRANSITIONS.verifying).toEqual(["reviewing", "executing"]);
		expect(SLICE_TRANSITIONS.reviewing).toEqual(["shipping", "executing"]);
		expect(SLICE_TRANSITIONS.shipping).toEqual(["closed"]);
		expect(SLICE_TRANSITIONS.closed).toEqual([]);
	});
});
