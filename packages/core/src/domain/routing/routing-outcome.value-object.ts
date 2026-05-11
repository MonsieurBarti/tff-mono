import { ValueObject } from "../shared/value-object.js";
import { PreconditionViolationError } from "../slice/slice.error.js";

export type OutcomeDimension = "agent" | "tier" | "unknown";
export type OutcomeVerdict = "ok" | "wrong" | "too-low" | "too-high";
export type OutcomeSourceKind = "debug-join" | "manual" | "model-judge";

export interface RoutingOutcomeProps {
	outcomeId: string;
	decisionId: string;
	dimension: OutcomeDimension;
	verdict: OutcomeVerdict;
	source: OutcomeSourceKind;
	sliceId: string;
	workflowId: string;
	reason?: string;
	emittedAt: string;
}

function isValidDimensionVerdict(dimension: OutcomeDimension, verdict: OutcomeVerdict): boolean {
	if (dimension === "agent") return verdict === "ok" || verdict === "wrong";
	if (dimension === "unknown") return verdict === "wrong";
	return true;
}

export class RoutingOutcome extends ValueObject<RoutingOutcomeProps> {
	private constructor(private readonly _props: RoutingOutcomeProps) {
		super();
		this.validate();
	}

	static create(props: RoutingOutcomeProps): RoutingOutcome {
		return new RoutingOutcome(props);
	}

	get outcomeId(): string {
		return this._props.outcomeId;
	}

	get decisionId(): string {
		return this._props.decisionId;
	}

	get dimension(): OutcomeDimension {
		return this._props.dimension;
	}

	get verdict(): OutcomeVerdict {
		return this._props.verdict;
	}

	get source(): OutcomeSourceKind {
		return this._props.source;
	}

	get sliceId(): string {
		return this._props.sliceId;
	}

	get workflowId(): string {
		return this._props.workflowId;
	}

	get reason(): string | undefined {
		return this._props.reason;
	}

	get emittedAt(): string {
		return this._props.emittedAt;
	}

	toJSON(): RoutingOutcomeProps {
		return this._props;
	}

	equals(other: ValueObject<RoutingOutcomeProps>): boolean {
		if (!(other instanceof RoutingOutcome)) return false;
		return (
			this._props.outcomeId === other._props.outcomeId &&
			this._props.decisionId === other._props.decisionId &&
			this._props.dimension === other._props.dimension &&
			this._props.verdict === other._props.verdict &&
			this._props.source === other._props.source &&
			this._props.sliceId === other._props.sliceId &&
			this._props.workflowId === other._props.workflowId &&
			this._props.reason === other._props.reason &&
			this._props.emittedAt === other._props.emittedAt
		);
	}

	validate(): void {
		if (!isValidDimensionVerdict(this._props.dimension, this._props.verdict)) {
			throw new PreconditionViolationError(
				`verdict "${this._props.verdict}" not allowed for dimension "${this._props.dimension}"`,
				["valid dimension×verdict combination"],
			);
		}
	}
}
