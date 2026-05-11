import { ValueObject } from "../shared/value-object.js";
import { PreconditionViolationError } from "../slice/slice.error.js";

export type JudgeDimension = "agent" | "tier";
export type JudgeVerdictValue = "ok" | "wrong" | "too-low" | "too-high";

export interface JudgeVerdictProps {
	decisionId: string;
	dimension: JudgeDimension;
	verdict: JudgeVerdictValue;
	reason: string;
}

function isValidDimensionVerdict(dimension: JudgeDimension, verdict: JudgeVerdictValue): boolean {
	if (dimension === "agent") return verdict === "ok" || verdict === "wrong";
	return true;
}

export class JudgeVerdict extends ValueObject<JudgeVerdictProps> {
	private constructor(private readonly _props: JudgeVerdictProps) {
		super();
		this.validate();
	}

	static create(props: JudgeVerdictProps): JudgeVerdict {
		return new JudgeVerdict(props);
	}

	get decisionId(): string {
		return this._props.decisionId;
	}

	get dimension(): JudgeDimension {
		return this._props.dimension;
	}

	get verdict(): JudgeVerdictValue {
		return this._props.verdict;
	}

	get reason(): string {
		return this._props.reason;
	}

	equals(other: ValueObject<JudgeVerdictProps>): boolean {
		if (!(other instanceof JudgeVerdict)) return false;
		return (
			this._props.decisionId === other._props.decisionId &&
			this._props.dimension === other._props.dimension &&
			this._props.verdict === other._props.verdict &&
			this._props.reason === other._props.reason
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
