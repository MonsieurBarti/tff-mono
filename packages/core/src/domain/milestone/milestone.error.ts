import { BaseDomainError } from "../shared/base-domain-error.js";

export class MilestoneNotFoundError extends BaseDomainError<{ milestoneId: string }> {
	readonly errorLabel = "MILESTONE_NOT_FOUND";
	readonly status = 404;
	readonly context: { milestoneId: string };

	constructor(milestoneId: string) {
		super();
		this.context = { milestoneId };
	}
}

export class MilestoneAlreadyArchivedError extends BaseDomainError<{ milestoneId: string }> {
	readonly errorLabel = "MILESTONE_ALREADY_ARCHIVED";
	readonly status = 409;
	readonly context: { milestoneId: string };

	constructor(milestoneId: string) {
		super();
		this.context = { milestoneId };
	}
}

export class InvalidTransitionError extends BaseDomainError<{
	from: string;
	to: string;
	expected: readonly string[];
}> {
	readonly errorLabel = "INVALID_TRANSITION";
	readonly status = 409;
	readonly context: { from: string; to: string; expected: readonly string[] };

	constructor(from: string, to: string, expected: readonly string[]) {
		super();
		this.context = { from, to, expected };
	}
}
