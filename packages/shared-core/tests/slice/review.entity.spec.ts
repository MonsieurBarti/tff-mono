import { describe, it, expect } from "vitest";
import { Review } from "../../src/domain/slice/review.entity.js";
import { ReviewRecordedEvent } from "../../src/domain/slice/review-recorded.event.js";
import { ReviewVerdictSetEvent } from "../../src/domain/slice/review-verdict-set.event.js";

describe("Review child entity", () => {
	describe("createNew", () => {
		it("creates a review with id 0 (auto-increment placeholder)", () => {
			const review = Review.createNew({ sliceId: "sl-1", type: "code", reviewer: "agent" });
			expect(review.id).toBe(0);
		});

		it("stores the given sliceId, type, and reviewer", () => {
			const review = Review.createNew({ sliceId: "sl-1", type: "security", reviewer: "human" });
			expect(review.sliceId).toBe("sl-1");
			expect(review.type).toBe("security");
			expect(review.reviewer).toBe("human");
		});

		it("stores optional commitSha and notes", () => {
			const review = Review.createNew({
				sliceId: "sl-1",
				type: "code",
				reviewer: "agent",
				commitSha: "abc123",
				notes: "lgtm",
			});
			expect(review.commitSha).toBe("abc123");
			expect(review.notes).toBe("lgtm");
		});

		it("defaults commitSha and notes to null", () => {
			const review = Review.createNew({ sliceId: "sl-1", type: "code", reviewer: "agent" });
			expect(review.commitSha).toBeNull();
			expect(review.notes).toBeNull();
		});

		it("sets verdict to null", () => {
			const review = Review.createNew({ sliceId: "sl-1", type: "code", reviewer: "agent" });
			expect(review.verdict).toBeNull();
		});

		it("sets createdAt to the current time", () => {
			const before = new Date();
			const review = Review.createNew({ sliceId: "sl-1", type: "code", reviewer: "agent" });
			const after = new Date();
			expect(review.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(review.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});

		it("emits a ReviewRecordedEvent", () => {
			const review = Review.createNew({ sliceId: "sl-1", type: "code", reviewer: "agent" });
			const events = review.pullEvents();
			expect(events).toHaveLength(1);
			expect(events[0]).toBeInstanceOf(ReviewRecordedEvent);
			expect(events[0].eventName).toBe("review.recorded");
			expect(events[0].payload).toEqual({
				reviewId: 0,
				sliceId: "sl-1",
				type: "code",
				reviewer: "agent",
			});
		});

		it("throws for empty sliceId", () => {
			expect(() => Review.createNew({ sliceId: "", type: "code", reviewer: "agent" })).toThrow();
		});

		it("throws for empty type", () => {
			expect(() => Review.createNew({ sliceId: "sl-1", type: "", reviewer: "agent" })).toThrow();
		});

		it("throws for empty reviewer", () => {
			expect(() => Review.createNew({ sliceId: "sl-1", type: "code", reviewer: "" })).toThrow();
		});
	});

	describe("reconstruct", () => {
		it("reconstructs a review from state", () => {
			const state = {
				id: 42,
				sliceId: "sl-1",
				type: "code",
				reviewer: "agent",
				verdict: "approved" as const,
				commitSha: "abc123",
				notes: "lgtm",
				createdAt: new Date("2024-01-01"),
			};
			const review = Review.reconstruct(state);
			expect(review.id).toBe(42);
			expect(review.sliceId).toBe("sl-1");
			expect(review.type).toBe("code");
			expect(review.reviewer).toBe("agent");
			expect(review.verdict).toBe("approved");
			expect(review.commitSha).toBe("abc123");
			expect(review.notes).toBe("lgtm");
			expect(review.createdAt).toEqual(new Date("2024-01-01"));
		});

		it("reconstructs with null verdict, commitSha, and notes", () => {
			const state = {
				id: 1,
				sliceId: "sl-1",
				type: "code",
				reviewer: "agent",
				verdict: null,
				commitSha: null,
				notes: null,
				createdAt: new Date("2024-01-01"),
			};
			const review = Review.reconstruct(state);
			expect(review.verdict).toBeNull();
			expect(review.commitSha).toBeNull();
			expect(review.notes).toBeNull();
		});

		it("does not emit events on reconstruct", () => {
			const state = {
				id: 1,
				sliceId: "sl-1",
				type: "code",
				reviewer: "agent",
				verdict: null,
				commitSha: null,
				notes: null,
				createdAt: new Date("2024-01-01"),
			};
			const review = Review.reconstruct(state);
			expect(review.pullEvents()).toHaveLength(0);
		});
	});

	describe("setVerdict", () => {
		it("sets the verdict to approved", () => {
			const review = Review.createNew({ sliceId: "sl-1", type: "code", reviewer: "agent" });
			review.pullEvents();
			review.setVerdict("approved");
			expect(review.verdict).toBe("approved");
		});

		it("sets the verdict to changes_requested", () => {
			const review = Review.createNew({ sliceId: "sl-1", type: "code", reviewer: "agent" });
			review.pullEvents();
			review.setVerdict("changes_requested");
			expect(review.verdict).toBe("changes_requested");
		});

		it("sets the verdict to commented", () => {
			const review = Review.createNew({ sliceId: "sl-1", type: "code", reviewer: "agent" });
			review.pullEvents();
			review.setVerdict("commented");
			expect(review.verdict).toBe("commented");
		});

		it("emits a ReviewVerdictSetEvent", () => {
			const review = Review.createNew({ sliceId: "sl-1", type: "code", reviewer: "agent" });
			review.pullEvents();
			review.setVerdict("approved");
			const events = review.pullEvents();
			expect(events).toHaveLength(1);
			expect(events[0]).toBeInstanceOf(ReviewVerdictSetEvent);
			expect(events[0].eventName).toBe("review.verdict.set");
			expect(events[0].payload).toEqual({ reviewId: 0, sliceId: "sl-1", verdict: "approved" });
		});

		it("throws for invalid verdict", () => {
			const review = Review.createNew({ sliceId: "sl-1", type: "code", reviewer: "agent" });
			expect(() => review.setVerdict("invalid" as "approved")).toThrow();
		});
	});
});

describe("ReviewRecordedEvent", () => {
	it("has the correct eventName and payload", () => {
		const event = ReviewRecordedEvent.create({
			reviewId: 1,
			sliceId: "sl-1",
			type: "code",
			reviewer: "agent",
		});
		expect(event.eventName).toBe("review.recorded");
		expect(event.payload).toEqual({
			reviewId: 1,
			sliceId: "sl-1",
			type: "code",
			reviewer: "agent",
		});
	});
});

describe("ReviewVerdictSetEvent", () => {
	it("has the correct eventName and payload", () => {
		const event = ReviewVerdictSetEvent.create({
			reviewId: 1,
			sliceId: "sl-1",
			verdict: "approved",
		});
		expect(event.eventName).toBe("review.verdict.set");
		expect(event.payload).toEqual({ reviewId: 1, sliceId: "sl-1", verdict: "approved" });
	});
});
