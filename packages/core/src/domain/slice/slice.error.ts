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
	readonly message: string;

	constructor(
		message: string,
		from: SliceStatus,
		to: SliceStatus,
		expected: readonly SliceStatus[],
		recoveryHint?: string,
	) {
		super(recoveryHint);
		this.message = message;
		this.context = { from, to, expected };
	}
}

export class TierClassificationError extends BaseDomainError<{ tier: string; reason: string }> {
	readonly errorLabel = "TIER_CLASSIFICATION_INVALID";
	readonly status = 400;
	readonly context: { tier: string; reason: string };
	readonly message: string;

	constructor(message: string, tier: string, reason: string, recoveryHint?: string) {
		super(recoveryHint);
		this.message = message;
		this.context = { tier, reason };
	}
}

export class SliceNotFoundError extends BaseDomainError<{ sliceId: string }> {
	readonly errorLabel = "SLICE_NOT_FOUND";
	readonly status = 404;
	readonly context: { sliceId: string };
	readonly message: string;

	constructor(message: string, sliceId: string, recoveryHint?: string) {
		super(recoveryHint);
		this.message = message;
		this.context = { sliceId };
	}
}

export class SliceAlreadyArchivedError extends BaseDomainError<{ sliceId: string }> {
	readonly errorLabel = "SLICE_ALREADY_ARCHIVED";
	readonly status = 409;
	readonly context: { sliceId: string };
	readonly message: string;

	constructor(message: string, sliceId: string, recoveryHint?: string) {
		super(recoveryHint);
		this.message = message;
		this.context = { sliceId };
	}
}

export class PreconditionViolationError extends BaseDomainError<{ preconditions: string[] }> {
	readonly errorLabel = "PRECONDITION_VIOLATION";
	readonly status = 422;
	readonly context: { preconditions: string[] };
	readonly message: string;

	constructor(message: string, preconditions: string[], recoveryHint?: string) {
		super(recoveryHint);
		this.message = message;
		this.context = { preconditions };
	}
}

export class HumanGateRequiredError extends BaseDomainError<{ status: string; message: string }> {
	readonly errorLabel = "HUMAN_GATE_REQUIRED";
	readonly status = 403;
	readonly context: { status: string; message: string };
	readonly message: string;

	constructor(message: string, status: string, messageStr: string, recoveryHint?: string) {
		super(recoveryHint);
		this.message = message;
		this.context = { status, message: messageStr };
	}
}

export class ReviewNotFoundError extends BaseDomainError<{ reviewId: number; sliceId: string }> {
	readonly errorLabel = "REVIEW_NOT_FOUND";
	readonly status = 404;
	readonly context: { reviewId: number; sliceId: string };
	readonly message: string;

	constructor(message: string, reviewId: number, sliceId: string, recoveryHint?: string) {
		super(recoveryHint);
		this.message = message;
		this.context = { reviewId, sliceId };
	}
}
