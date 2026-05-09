/* eslint-disable max-classes-per-file */

import { BaseDomainError } from "../shared/base-domain-error.js";
import type { SliceStatus } from "./transitions.js";

export class InvalidTransitionError extends BaseDomainError<{
	from: SliceStatus;
	to: SliceStatus;
	expected: readonly SliceStatus[];
}> {
	readonly errorLabel = "INVALID_TRANSITION";
	readonly status = 409;
	readonly context: { from: SliceStatus; to: SliceStatus; expected: readonly SliceStatus[] };

	constructor(from: SliceStatus, to: SliceStatus, expected: readonly SliceStatus[]) {
		super();
		this.context = { from, to, expected };
	}
}

export class TierClassificationError extends BaseDomainError<{ tier: string; reason: string }> {
	readonly errorLabel = "TIER_CLASSIFICATION_INVALID";
	readonly status = 400;
	readonly context: { tier: string; reason: string };

	constructor(tier: string, reason: string) {
		super();
		this.context = { tier, reason };
	}
}

export class SliceNotFoundError extends BaseDomainError<{ sliceId: string }> {
	readonly errorLabel = "SLICE_NOT_FOUND";
	readonly status = 404;
	readonly context: { sliceId: string };

	constructor(sliceId: string) {
		super();
		this.context = { sliceId };
	}
}

export class SliceAlreadyArchivedError extends BaseDomainError<{ sliceId: string }> {
	readonly errorLabel = "SLICE_ALREADY_ARCHIVED";
	readonly status = 409;
	readonly context: { sliceId: string };

	constructor(sliceId: string) {
		super();
		this.context = { sliceId };
	}
}

export class PreconditionViolationError extends BaseDomainError<{ preconditions: string[] }> {
	readonly errorLabel = "PRECONDITION_VIOLATION";
	readonly status = 422;
	readonly context: { preconditions: string[] };

	constructor(preconditions: string[]) {
		super();
		this.context = { preconditions };
	}
}

export class HumanGateRequiredError extends BaseDomainError<{ status: string; message: string }> {
	readonly errorLabel = "HUMAN_GATE_REQUIRED";
	readonly status = 403;
	readonly context: { status: string; message: string };

	constructor(status: string, message: string) {
		super();
		this.context = { status, message };
	}
}
