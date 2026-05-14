/* eslint-disable unicorn/no-null */

import { z } from "zod";
import { randomUUID } from "node:crypto";
import { AggregateRoot } from "../shared/aggregate-root.js";
import type { IDateProvider } from "../shared/date-provider.js";
import { TaskCreatedEvent } from "./task-created.event.js";
import { TaskClaimedEvent } from "./task-claimed.event.js";
import { TaskClosedEvent } from "./task-closed.event.js";
import { TaskUnclaimedEvent } from "./task-unclaimed.event.js";
import { AlreadyClaimedError, InvalidTransitionError } from "./task.error.js";
import { TASK_TRANSITIONS, type TaskStatus } from "./transitions.js";

const createTaskSchema = z.object({
	sliceId: z.string().min(1),
	number: z.number().int().positive(),
	title: z.string().min(1),
	description: z.string().optional(),
	wave: z.number().int().nonnegative().optional(),
	difficulty: z.number().int().nonnegative().optional(),
});

const renameSchema = z.string().min(1);
const closeReasonSchema = z.string().min(1);

export interface TaskState {
	id: string;
	sliceId: string;
	number: number;
	title: string;
	description: string;
	status: TaskStatus;
	wave: number | null;
	difficulty: number | null;
	claimedAt: Date | null;
	claimedBy: string | null;
	closedReason: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export class Task extends AggregateRoot {
	private readonly _sliceId: string;
	private readonly _number: number;
	private _title: string;
	private _description: string;
	private _status: TaskStatus;
	private _wave: number | null;
	private _difficulty: number | null;
	private _claimedAt: Date | null;
	private _claimedBy: string | null;
	private _closedReason: string | null;
	private readonly _createdAt: Date;
	private _updatedAt: Date;

	private constructor(props: {
		id: string;
		sliceId: string;
		number: number;
		title: string;
		description: string;
		status: TaskStatus;
		wave: number | null;
		difficulty: number | null;
		claimedAt: Date | null;
		claimedBy: string | null;
		closedReason: string | null;
		createdAt: Date;
		updatedAt: Date;
	}) {
		super(props.id);
		this._sliceId = props.sliceId;
		this._number = props.number;
		this._title = props.title;
		this._description = props.description;
		this._status = props.status;
		this._wave = props.wave;
		this._difficulty = props.difficulty;
		this._claimedAt = props.claimedAt;
		this._claimedBy = props.claimedBy;
		this._closedReason = props.closedReason;
		this._createdAt = props.createdAt;
		this._updatedAt = props.updatedAt;
	}

	static createNew(props: {
		sliceId: string;
		number: number;
		title: string;
		description?: string;
		wave?: number;
		difficulty?: number;
	}): Task {
		const validated = createTaskSchema.parse(props);
		const now = new Date();
		const uuid = randomUUID();

		const task = new Task({
			id: uuid,
			sliceId: validated.sliceId,
			number: validated.number,
			title: validated.title,
			description: validated.description ?? "",
			status: "open",
			wave: validated.wave ?? null,
			difficulty: validated.difficulty ?? null,
			claimedAt: null,
			claimedBy: null,
			closedReason: null,
			createdAt: now,
			updatedAt: now,
		});

		task.addEvent(
			TaskCreatedEvent.create({
				taskId: uuid,
				sliceId: validated.sliceId,
				number: validated.number,
				title: validated.title,
			}),
		);

		return task;
	}

	static reconstruct(state: TaskState): Task {
		return new Task({
			id: state.id,
			sliceId: state.sliceId,
			number: state.number,
			title: state.title,
			description: state.description,
			status: state.status,
			wave: state.wave,
			difficulty: state.difficulty,
			claimedAt: state.claimedAt,
			claimedBy: state.claimedBy,
			closedReason: state.closedReason,
			createdAt: state.createdAt,
			updatedAt: state.updatedAt,
		});
	}

	get sliceId(): string {
		return this._sliceId;
	}

	get number(): number {
		return this._number;
	}

	get title(): string {
		return this._title;
	}

	get description(): string {
		return this._description;
	}

	get status(): TaskStatus {
		return this._status;
	}

	get wave(): number | null {
		return this._wave;
	}

	get difficulty(): number | null {
		return this._difficulty;
	}

	get claimedAt(): Date | null {
		return this._claimedAt;
	}

	get claimedBy(): string | null {
		return this._claimedBy;
	}

	get closedReason(): string | null {
		return this._closedReason;
	}

	get createdAt(): Date {
		return this._createdAt;
	}

	get updatedAt(): Date {
		return this._updatedAt;
	}

	get isOpen(): boolean {
		return this._status === "open";
	}

	get isClaimed(): boolean {
		return this._status === "in_progress";
	}

	get isClosed(): boolean {
		return this._status === "closed";
	}

	toJSON(): TaskState {
		return {
			id: this.id,
			sliceId: this._sliceId,
			number: this._number,
			title: this._title,
			description: this._description,
			status: this._status,
			wave: this._wave,
			difficulty: this._difficulty,
			claimedAt: this._claimedAt,
			claimedBy: this._claimedBy,
			closedReason: this._closedReason,
			createdAt: this._createdAt,
			updatedAt: this._updatedAt,
		};
	}

	rename(title: string): void {
		const validated = renameSchema.parse(title);
		this._title = validated;
		this._updatedAt = new Date();
	}

	claim(actor: string, dateProvider: IDateProvider): void {
		if (this._claimedBy !== null) {
			throw new AlreadyClaimedError(
				`Task ${this._id} is already claimed by ${this._claimedBy}`,
				this._id,
				this._claimedBy,
			);
		}
		if (this._status !== "open") {
			throw new InvalidTransitionError(
				`Invalid transition from ${this._status} to in_progress`,
				this._status,
				"in_progress",
				TASK_TRANSITIONS[this._status],
			);
		}
		this._claimedBy = actor;
		this._claimedAt = dateProvider.now();
		this._status = "in_progress";
		this._updatedAt = dateProvider.now();
		this.addEvent(
			TaskClaimedEvent.create({
				taskId: this._id,
				sliceId: this._sliceId,
				claimedBy: actor,
				claimedAt: this._claimedAt.toISOString(),
			}),
		);
	}

	close(reason: string, dateProvider: IDateProvider): void {
		if (this._status !== "in_progress") {
			throw new InvalidTransitionError(
				`Invalid transition from ${this._status} to closed`,
				this._status,
				"closed",
				TASK_TRANSITIONS[this._status],
			);
		}
		const validated = closeReasonSchema.parse(reason);
		this._closedReason = validated;
		this._status = "closed";
		this._updatedAt = dateProvider.now();
		this.addEvent(
			TaskClosedEvent.create({
				taskId: this._id,
				sliceId: this._sliceId,
				closedReason: validated,
				closedAt: this._updatedAt.toISOString(),
			}),
		);
	}

	unclaim(): void {
		if (this._status !== "in_progress") {
			throw new InvalidTransitionError(
				`Invalid transition from ${this._status} to open`,
				this._status,
				"open",
				TASK_TRANSITIONS[this._status],
			);
		}
		this._claimedBy = null;
		this._claimedAt = null;
		this._status = "open";
		this._updatedAt = new Date();
		this.addEvent(
			TaskUnclaimedEvent.create({
				taskId: this._id,
				sliceId: this._sliceId,
			}),
		);
	}
}
