import { z } from "zod";
import type { DomainEvent } from "../shared/domain-event.js";
import { ReviewRecordedEvent } from "./review-recorded.event.js";
import { ReviewVerdictSetEvent } from "./review-verdict-set.event.js";

const createReviewSchema = z.object({
	sliceId: z.string().min(1),
	type: z.string().min(1),
	reviewer: z.string().min(1),
	commitSha: z.string().optional(),
	notes: z.string().optional(),
});

const verdictSchema = z.enum(["approved", "changes_requested", "commented"]);

export interface ReviewState {
	id: number;
	sliceId: string;
	type: string;
	reviewer: string;
	verdict: "approved" | "changes_requested" | "commented" | null;
	commitSha: string | null;
	notes: string | null;
	createdAt: Date;
}

export class Review {
	private readonly _id: number;
	private readonly _sliceId: string;
	private readonly _type: string;
	private readonly _reviewer: string;
	private _verdict: "approved" | "changes_requested" | "commented" | null;
	private readonly _commitSha: string | null;
	private readonly _notes: string | null;
	private readonly _createdAt: Date;
	private _events: DomainEvent<unknown>[] = [];

	private constructor(props: {
		id: number;
		sliceId: string;
		type: string;
		reviewer: string;
		verdict: "approved" | "changes_requested" | "commented" | null;
		commitSha: string | null;
		notes: string | null;
		createdAt: Date;
	}) {
		this._id = props.id;
		this._sliceId = props.sliceId;
		this._type = props.type;
		this._reviewer = props.reviewer;
		this._verdict = props.verdict;
		this._commitSha = props.commitSha;
		this._notes = props.notes;
		this._createdAt = props.createdAt;
	}

	static createNew(props: {
		sliceId: string;
		type: string;
		reviewer: string;
		commitSha?: string;
		notes?: string;
	}): Review {
		const validated = createReviewSchema.parse(props);
		const now = new Date();
		const review = new Review({
			id: 0,
			sliceId: validated.sliceId,
			type: validated.type,
			reviewer: validated.reviewer,
			verdict: null,
			commitSha: validated.commitSha ?? null,
			notes: validated.notes ?? null,
			createdAt: now,
		});
		review.addEvent(
			ReviewRecordedEvent.create({
				reviewId: review.id,
				sliceId: validated.sliceId,
				type: validated.type,
				reviewer: validated.reviewer,
			}),
		);
		return review;
	}

	static reconstruct(state: ReviewState): Review {
		return new Review({
			id: state.id,
			sliceId: state.sliceId,
			type: state.type,
			reviewer: state.reviewer,
			verdict: state.verdict,
			commitSha: state.commitSha,
			notes: state.notes,
			createdAt: state.createdAt,
		});
	}

	get id(): number {
		return this._id;
	}

	get sliceId(): string {
		return this._sliceId;
	}

	get type(): string {
		return this._type;
	}

	get reviewer(): string {
		return this._reviewer;
	}

	get verdict(): "approved" | "changes_requested" | "commented" | null {
		return this._verdict;
	}

	get commitSha(): string | null {
		return this._commitSha;
	}

	get notes(): string | null {
		return this._notes;
	}

	get createdAt(): Date {
		return this._createdAt;
	}

	setVerdict(verdict: "approved" | "changes_requested" | "commented"): void {
		const validated = verdictSchema.parse(verdict);
		this._verdict = validated;
		this.addEvent(
			ReviewVerdictSetEvent.create({
				reviewId: this.id,
				sliceId: this._sliceId,
				verdict: validated,
			}),
		);
	}

	addEvent(event: DomainEvent<unknown>): void {
		this._events.push(event);
	}

	pullEvents(): DomainEvent<unknown>[] {
		const events = this._events;
		this._events = [];
		return events;
	}
}
