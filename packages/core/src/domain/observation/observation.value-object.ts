import { ValueObject } from "../shared/value-object.js";

export interface ObservationProps {
	ts: string;
	session: string;
	tool: string;
	args: string | null;
	project: string;
}

export class Observation extends ValueObject<ObservationProps> {
	private constructor(private readonly _props: ObservationProps) {
		super();
		this.validate();
	}

	static create(props: ObservationProps): Observation {
		return new Observation(props);
	}

	get ts(): string {
		return this._props.ts;
	}

	get session(): string {
		return this._props.session;
	}

	get tool(): string {
		return this._props.tool;
	}

	get args(): string | null {
		return this._props.args;
	}

	get project(): string {
		return this._props.project;
	}

	get props(): ObservationProps {
		return { ...this._props };
	}

	equals(other: ValueObject<ObservationProps>): boolean {
		return (
			other instanceof Observation &&
			this._props.ts === other._props.ts &&
			this._props.session === other._props.session &&
			this._props.tool === other._props.tool &&
			this._props.args === other._props.args &&
			this._props.project === other._props.project
		);
	}

	validate(): void {
		if (this._props.tool === "") {
			throw new Error("Observation tool cannot be empty");
		}
	}
}
