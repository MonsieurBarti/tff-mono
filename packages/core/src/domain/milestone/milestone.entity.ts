import { z } from "zod";
import { randomUUID } from "node:crypto";
import { AggregateRoot } from "../shared/aggregate-root.js";
import type { IDateProvider } from "../shared/date-provider.js";
import { MilestoneCreatedEvent } from "./milestone-created.event.js";
import { MilestoneTransitionedEvent } from "./milestone-transitioned.event.js";
import { MilestoneArchivedEvent } from "./milestone-archived.event.js";
import { MilestoneAlreadyArchivedError, InvalidTransitionError } from "./milestone.error.js";
import { MILESTONE_TRANSITIONS, type MilestoneStatus } from "./transitions.js";

const createMilestoneSchema = z.object({
	projectId: z.string().min(1),
	number: z.number().int().positive(),
	name: z.string().min(1),
});

const renameSchema = z.string().min(1);
const closeReasonSchema = z.string().min(1);

export interface MilestoneState {
	id: string;
	projectId: string;
	number: number;
	name: string;
	status: MilestoneStatus;
	branch: string;
	closeReason: string | null;
	createdAt: Date;
	updatedAt: Date;
	archivedAt: Date | null;
}

export class Milestone extends AggregateRoot {
	private readonly _projectId: string;
	private readonly _number: number;
	private _name: string;
	private _status: MilestoneStatus;
	private _branch: string;
	private _closeReason: string | null;
	private readonly _createdAt: Date;
	private _updatedAt: Date;
	private _archivedAt: Date | null;

	private constructor(props: {
		id: string;
		projectId: string;
		number: number;
		name: string;
		status: MilestoneStatus;
		branch: string;
		closeReason: string | null;
		createdAt: Date;
		updatedAt: Date;
		archivedAt: Date | null;
	}) {
		super(props.id);
		this._projectId = props.projectId;
		this._number = props.number;
		this._name = props.name;
		this._status = props.status;
		this._branch = props.branch;
		this._closeReason = props.closeReason;
		this._createdAt = props.createdAt;
		this._updatedAt = props.updatedAt;
		this._archivedAt = props.archivedAt;
	}

	static createNew(props: { projectId: string; number: number; name: string }): Milestone {
		const validated = createMilestoneSchema.parse(props);
		const now = new Date();
		const uuid = randomUUID();
		const prefix = uuid.split("-")[0];
		const branch = `milestone/${prefix}`;

		const milestone = new Milestone({
			id: uuid,
			projectId: validated.projectId,
			number: validated.number,
			name: validated.name,
			status: "created",
			branch,
			closeReason: null,
			createdAt: now,
			updatedAt: now,
			archivedAt: null,
		});

		milestone.addEvent(
			MilestoneCreatedEvent.create({
				milestoneId: uuid,
				projectId: validated.projectId,
				number: validated.number,
				name: validated.name,
			}),
		);

		return milestone;
	}

	static reconstruct(state: MilestoneState): Milestone {
		return new Milestone({
			id: state.id,
			projectId: state.projectId,
			number: state.number,
			name: state.name,
			status: state.status,
			branch: state.branch,
			closeReason: state.closeReason,
			createdAt: state.createdAt,
			updatedAt: state.updatedAt,
			archivedAt: state.archivedAt,
		});
	}

	get projectId(): string {
		return this._projectId;
	}

	get number(): number {
		return this._number;
	}

	get name(): string {
		return this._name;
	}

	get status(): MilestoneStatus {
		return this._status;
	}

	get branch(): string {
		return this._branch;
	}

	get closeReason(): string | null {
		return this._closeReason;
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

	toJSON(): MilestoneState {
		return {
			id: this.id,
			projectId: this._projectId,
			number: this._number,
			name: this._name,
			status: this._status,
			branch: this._branch,
			closeReason: this._closeReason,
			createdAt: this._createdAt,
			updatedAt: this._updatedAt,
			archivedAt: this._archivedAt,
		};
	}

	rename(name: string): void {
		if (this.isArchived) {
			throw new MilestoneAlreadyArchivedError(`Cannot rename archived milestone`, this._id);
		}
		const validated = renameSchema.parse(name);
		this._name = validated;
		this._updatedAt = new Date();
	}

	transition(to: MilestoneStatus): void {
		if (this.isArchived) {
			throw new MilestoneAlreadyArchivedError(`Cannot transition archived milestone`, this._id);
		}
		const allowed = MILESTONE_TRANSITIONS[this._status];
		if (!allowed.includes(to)) {
			throw new InvalidTransitionError(
				`Invalid transition from ${this._status} to ${to}`,
				this._status,
				to,
				allowed,
			);
		}
		const from = this._status;
		this._status = to;
		this._updatedAt = new Date();
		this.addEvent(
			MilestoneTransitionedEvent.create({
				milestoneId: this._id,
				from,
				to,
			}),
		);
	}

	archive(dateProvider: IDateProvider): void {
		if (this._archivedAt !== null) {
			throw new MilestoneAlreadyArchivedError(`Milestone is already archived`, this._id);
		}
		this._archivedAt = dateProvider.now();
		this._updatedAt = dateProvider.now();
		this.addEvent(
			MilestoneArchivedEvent.create({
				milestoneId: this._id,
				archivedAt: this._archivedAt.toISOString(),
			}),
		);
	}

	setCloseReason(reason: string): void {
		if (this.isArchived) {
			throw new MilestoneAlreadyArchivedError(
				`Cannot set close reason on archived milestone`,
				this._id,
			);
		}
		const validated = closeReasonSchema.parse(reason);
		this._closeReason = validated;
		this._updatedAt = new Date();
	}
}
