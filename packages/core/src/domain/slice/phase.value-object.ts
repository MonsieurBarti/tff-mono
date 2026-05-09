import { ValueObject } from "../shared/value-object.js";

export const PHASE_VALUES = [
	"discuss",
	"research",
	"plan",
	"execute",
	"verify",
	"review",
	"ship",
] as const;

export const PIPELINE_PHASE_ORDER = [
	"discuss",
	"research",
	"plan",
	"execute",
	"verify",
	"review",
	"ship",
] as const;

export class Phase extends ValueObject<string> {
	private constructor(private readonly _value: string) {
		super();
		this.validate();
	}

	static create(value: string): Phase {
		return new Phase(value);
	}

	get value(): string {
		return this._value;
	}

	get order(): number {
		return (PIPELINE_PHASE_ORDER as readonly string[]).indexOf(this._value);
	}

	isBefore(other: Phase): boolean {
		return this.order < other.order;
	}

	isAfter(other: Phase): boolean {
		return this.order > other.order;
	}

	next(): Phase | null {
		const nextOrder = this.order + 1;
		const nextValue = PIPELINE_PHASE_ORDER[nextOrder];
		if (nextValue === undefined) {
			return null;
		}
		return new Phase(nextValue);
	}

	equals(other: ValueObject<string>): boolean {
		return other instanceof Phase && this._value === other._value;
	}

	validate(): void {
		if (PIPELINE_PHASE_ORDER.indexOf(this._value as (typeof PIPELINE_PHASE_ORDER)[number]) === -1) {
			throw new Error(`Invalid phase: ${this._value}`);
		}
	}
}
