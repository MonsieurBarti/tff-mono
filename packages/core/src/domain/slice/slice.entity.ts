/* eslint-disable max-lines */
/* eslint-disable unicorn/no-null */

import { z } from "zod";
import { randomUUID } from "node:crypto";
import { AggregateRoot } from "../shared/aggregate-root.js";
import type { IDateProvider } from "../shared/date-provider.js";
import { BranchName } from "./branch-name.value-object.js";
import { Review, type ReviewState } from "./review.entity.js";
import { SliceCreatedEvent } from "./slice-created.event.js";
import { SliceTransitionedEvent } from "./slice-transitioned.event.js";
import { SliceTierClassifiedEvent } from "./slice-tier-classified.event.js";
import { SliceArchivedEvent } from "./slice-archived.event.js";
import {
	InvalidTransitionError,
	TierClassificationError,
	SliceAlreadyArchivedError,
	PreconditionViolationError,
	ReviewNotFoundError,
} from "./slice.error.js";
import { SLICE_TRANSITIONS, type ComplexityTier, type SliceStatus } from "./transitions.js";
import { reviewExistsGuard, tierSkipGuard } from "./guards.js";

const createSliceSchema = z.object({
	milestoneId: z.string().min(1).nullable(),
	kind: z.enum(["milestone", "quick", "debug"]),
	number: z.number().int().positive(),
	title: z.string().min(1),
	baseBranch: z.string().min(1),
});

const renameSchema = z.string().min(1);

const tierSchema = z.enum(["S", "SS", "SSS"]);

export interface SliceState {
	id: string;
	milestoneId: string | null;
	kind: "milestone" | "quick" | "debug";
	number: number;
	title: string;
	status: SliceStatus;
	tier: ComplexityTier | null;
	baseBranch: string;
	branchName: string;
	createdAt: Date;
	updatedAt: Date;
	archivedAt: Date | null;
}

export interface TransitionContext {
	tier?: ComplexityTier;
	actor?: string;
}

export class Slice extends AggregateRoot {
	private readonly _milestoneId: string | null;
	private readonly _kind: "milestone" | "quick" | "debug";
	private readonly _number: number;
	private _title: string;
	private _status: SliceStatus;
	private _tier: ComplexityTier | null;
	private readonly _baseBranch: string;
	private readonly _branchName: string;
	private readonly _createdAt: Date;
	private _updatedAt: Date;
	private _archivedAt: Date | null;
	private _reviews: Review[] = [];

	private constructor(props: {
		id: string;
		milestoneId: string | null;
		kind: "milestone" | "quick" | "debug";
		number: number;
		title: string;
		status: SliceStatus;
		tier: ComplexityTier | null;
		baseBranch: string;
		branchName: string;
		createdAt: Date;
		updatedAt: Date;
		archivedAt: Date | null;
		reviews: Review[] | undefined;
	}) {
		super(props.id);
		this._milestoneId = props.milestoneId;
		this._kind = props.kind;
		this._number = props.number;
		this._title = props.title;
		this._status = props.status;
		this._tier = props.tier;
		this._baseBranch = props.baseBranch;
		this._branchName = props.branchName;
		this._createdAt = props.createdAt;
		this._updatedAt = props.updatedAt;
		this._archivedAt = props.archivedAt;
		if (props.reviews) {
			this._reviews = props.reviews;
		}
	}

	static createNew(props: {
		milestoneId: string | null;
		kind: "milestone" | "quick" | "debug";
		number: number;
		title: string;
		baseBranch: string;
	}): Slice {
		const validated = createSliceSchema.parse(props);
		const now = new Date();
		const uuid = randomUUID();
		const branchName = BranchName.generate(validated.kind, validated.number).value;

		const slice = new Slice({
			id: uuid,
			milestoneId: validated.milestoneId,
			kind: validated.kind,
			number: validated.number,
			title: validated.title,
			status: "created",
			tier: null,
			baseBranch: validated.baseBranch,
			branchName,
			createdAt: now,
			updatedAt: now,
			archivedAt: null,
			reviews: undefined,
		});

		slice.addEvent(
			SliceCreatedEvent.create({
				sliceId: uuid,
				milestoneId: validated.milestoneId,
				kind: validated.kind,
				number: validated.number,
				title: validated.title,
			}),
		);

		return slice;
	}

	static reconstruct(state: SliceState & { reviews?: ReviewState[] }): Slice {
		const reviews = state.reviews?.map((r) => Review.reconstruct(r));
		return new Slice({
			id: state.id,
			milestoneId: state.milestoneId,
			kind: state.kind,
			number: state.number,
			title: state.title,
			status: state.status,
			tier: state.tier,
			baseBranch: state.baseBranch,
			branchName: state.branchName,
			createdAt: state.createdAt,
			updatedAt: state.updatedAt,
			archivedAt: state.archivedAt,
			reviews,
		});
	}

	get milestoneId(): string | null {
		return this._milestoneId;
	}

	get kind(): "milestone" | "quick" | "debug" {
		return this._kind;
	}

	get number(): number {
		return this._number;
	}

	get title(): string {
		return this._title;
	}

	get status(): SliceStatus {
		return this._status;
	}

	get tier(): ComplexityTier | null {
		return this._tier;
	}

	get baseBranch(): string {
		return this._baseBranch;
	}

	get branchName(): string {
		return this._branchName;
	}

	get createdAt(): Date {
		return this._createdAt;
	}

	get updatedAt(): Date {
		return this._updatedAt;
	}

	get archivedAt(): Date | null {
		return this._archivedAt;
	}

	get isArchived(): boolean {
		return this._archivedAt !== null;
	}

	get reviews(): readonly Review[] {
		return [...this._reviews];
	}

	rename(title: string): void {
		if (this.isArchived) {
			throw new SliceAlreadyArchivedError(this._id);
		}
		const validated = renameSchema.parse(title);
		this._title = validated;
		this._updatedAt = new Date();
	}

	transition(to: SliceStatus, context?: TransitionContext): void {
		if (this.isArchived) {
			throw new SliceAlreadyArchivedError(this._id);
		}
		const allowed = SLICE_TRANSITIONS[this._status];
		const isAllowed = allowed.includes(to);
		const isTierSkip = tierSkipGuard(this._status, to, this._tier).ok;
		if (!isAllowed && !isTierSkip) {
			throw new InvalidTransitionError(this._status, to, allowed);
		}

		if (this._status === "verifying" && to === "reviewing") {
			const guardResult = reviewExistsGuard(this._reviews);
			if (!guardResult.ok) {
				throw new PreconditionViolationError([
					guardResult.reason ?? "Review existence check failed",
				]);
			}
		}

		const from = this._status;
		this._status = to;
		this._updatedAt = new Date();
		const payload: { sliceId: string; from: string; to: string; triggeredBy?: string } = {
			sliceId: this._id,
			from,
			to,
		};
		if (context?.actor !== undefined) {
			payload.triggeredBy = context.actor;
		}
		this.addEvent(SliceTransitionedEvent.create(payload));
	}

	classifyTier(tier: ComplexityTier): void {
		if (this.isArchived) {
			throw new SliceAlreadyArchivedError(this._id);
		}
		const validated = tierSchema.safeParse(tier);
		if (!validated.success) {
			throw new TierClassificationError(tier, "Invalid tier value");
		}
		this._tier = validated.data;
		this._updatedAt = new Date();
		this.addEvent(
			SliceTierClassifiedEvent.create({
				sliceId: this._id,
				tier: validated.data,
			}),
		);
	}

	archive(dateProvider: IDateProvider): void {
		if (this._archivedAt !== null) {
			throw new SliceAlreadyArchivedError(this._id);
		}
		this._archivedAt = dateProvider.now();
		this._updatedAt = dateProvider.now();
		this.addEvent(
			SliceArchivedEvent.create({
				sliceId: this._id,
				archivedAt: this._archivedAt.toISOString(),
			}),
		);
	}

	recordReview(props: {
		type: string;
		reviewer: string;
		commitSha?: string;
		notes?: string;
	}): void {
		if (this.isArchived) {
			throw new SliceAlreadyArchivedError(this._id);
		}
		const reviewProps: {
			sliceId: string;
			type: string;
			reviewer: string;
			commitSha?: string;
			notes?: string;
		} = {
			sliceId: this._id,
			type: props.type,
			reviewer: props.reviewer,
		};
		if (props.commitSha !== undefined) {
			reviewProps.commitSha = props.commitSha;
		}
		if (props.notes !== undefined) {
			reviewProps.notes = props.notes;
		}
		const review = Review.createNew(reviewProps);
		this._reviews.push(review);
		const reviewEvents = review.pullEvents();
		for (const event of reviewEvents) {
			this.addEvent(event);
		}
	}

	setReviewVerdict(
		reviewId: number,
		verdict: "approved" | "changes_requested" | "commented",
	): void {
		if (this.isArchived) {
			throw new SliceAlreadyArchivedError(this._id);
		}
		const review = this._reviews.find((r) => r.id === reviewId);
		if (!review) {
			throw new ReviewNotFoundError(reviewId, this._id);
		}
		review.setVerdict(verdict);
		const reviewEvents = review.pullEvents();
		for (const event of reviewEvents) {
			this.addEvent(event);
		}
	}
}
