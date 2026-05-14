/* eslint-disable max-classes-per-file */

import { BaseDomainError } from "../shared/base-domain-error.js";

export class AlreadyClaimedError extends BaseDomainError<{ taskId: string; claimedBy: string }> {
	readonly errorLabel = "ALREADY_CLAIMED";
	readonly code = this.errorLabel;
	readonly status = 409;
	readonly context: { taskId: string; claimedBy: string };
	readonly message: string;

	constructor(message: string, taskId: string, claimedBy: string, recoveryHint?: string) {
		super(recoveryHint);
		this.message = message;
		this.context = { taskId, claimedBy };
	}
}

export class TaskNotFoundError extends BaseDomainError<{ taskId: string }> {
	readonly errorLabel = "TASK_NOT_FOUND";
	readonly code = this.errorLabel;
	readonly status = 404;
	readonly context: { taskId: string };
	readonly message: string;

	constructor(message: string, taskId: string, recoveryHint?: string) {
		super(recoveryHint);
		this.message = message;
		this.context = { taskId };
	}
}

export class InvalidTransitionError extends BaseDomainError<{
	from: string;
	to: string;
	expected: readonly string[];
}> {
	readonly errorLabel = "INVALID_TRANSITION";
	readonly code = this.errorLabel;
	readonly status = 409;
	readonly context: { from: string; to: string; expected: readonly string[] };
	readonly message: string;

	constructor(
		message: string,
		from: string,
		to: string,
		expected: readonly string[],
		recoveryHint?: string,
	) {
		super(recoveryHint);
		this.message = message;
		this.context = { from, to, expected };
	}
}
