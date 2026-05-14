import { BaseDomainError } from "../shared/base-domain-error.js";

export class MilestoneNotFoundError extends BaseDomainError<{ milestoneId: string }> {
	readonly errorLabel = "MILESTONE_NOT_FOUND";
	readonly code = this.errorLabel;
	readonly status = 404;
	readonly context: { milestoneId: string };
	readonly message: string;

	constructor(message: string, milestoneId: string, recoveryHint?: string) {
		super(recoveryHint);
		this.message = message;
		this.context = { milestoneId };
	}
}

export class MilestoneAlreadyArchivedError extends BaseDomainError<{ milestoneId: string }> {
	readonly errorLabel = "MILESTONE_ALREADY_ARCHIVED";
	readonly code = this.errorLabel;
	readonly status = 409;
	readonly context: { milestoneId: string };
	readonly message: string;

	constructor(message: string, milestoneId: string, recoveryHint?: string) {
		super(recoveryHint);
		this.message = message;
		this.context = { milestoneId };
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
