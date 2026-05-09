import { z } from "zod";
import { AggregateRoot } from "../shared/aggregate-root.js";
import { ProjectCreatedEvent } from "./project-created.event.js";
import { ProjectVisionUpdatedEvent } from "./project-vision-updated.event.js";
import { ProjectNameUpdatedEvent } from "./project-name-updated.event.js";

const createProjectSchema = z.object({
	name: z.string().min(1),
	vision: z.string().min(1),
});

const updateVisionSchema = z.string().min(1);
const updateNameSchema = z.string().min(1);

export interface ProjectState {
	id: string;
	name: string;
	vision: string;
	createdAt: Date;
	updatedAt: Date;
}

export class Project extends AggregateRoot {
	private _name: string;
	private _vision: string;
	private readonly _createdAt: Date;
	private _updatedAt: Date;

	private constructor(props: { name: string; vision: string; createdAt: Date; updatedAt: Date }) {
		super("singleton");
		this._name = props.name;
		this._vision = props.vision;
		this._createdAt = props.createdAt;
		this._updatedAt = props.updatedAt;
	}

	static createNew(props: { name: string; vision: string }): Project {
		const validated = createProjectSchema.parse(props);
		const now = new Date();
		const project = new Project({
			name: validated.name,
			vision: validated.vision,
			createdAt: now,
			updatedAt: now,
		});
		project.addEvent(ProjectCreatedEvent.create({ projectId: "singleton", name: validated.name }));
		return project;
	}

	static reconstruct(state: ProjectState): Project {
		return new Project({
			name: state.name,
			vision: state.vision,
			createdAt: state.createdAt,
			updatedAt: state.updatedAt,
		});
	}

	get name(): string {
		return this._name;
	}

	get vision(): string {
		return this._vision;
	}

	get createdAt(): Date {
		return this._createdAt;
	}

	get updatedAt(): Date {
		return this._updatedAt;
	}

	updateVision(vision: string): void {
		const validated = updateVisionSchema.parse(vision);
		const oldVision = this._vision;
		this._vision = validated;
		this._updatedAt = new Date();
		this.addEvent(
			ProjectVisionUpdatedEvent.create({
				projectId: "singleton",
				oldVision,
				newVision: validated,
			}),
		);
	}

	updateName(name: string): void {
		const validated = updateNameSchema.parse(name);
		const oldName = this._name;
		this._name = validated;
		this._updatedAt = new Date();
		this.addEvent(
			ProjectNameUpdatedEvent.create({
				projectId: "singleton",
				oldName,
				newName: validated,
			}),
		);
	}
}
