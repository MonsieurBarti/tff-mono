/* eslint-disable max-classes-per-file */

import { BaseDomainError } from "../shared/base-domain-error.js";

export class AlreadyClaimedError extends BaseDomainError<{ taskId: string; claimedBy: string }> {
	readonly errorLabel = "ALREADY_CLAIMED";
	readonly status = 409;
	readonly context: { taskId: string; claimedBy: string };

	constructor(taskId: string, claimedBy: string) {
		super();
		this.context = { taskId, claimedBy };
	}
}

export class TaskNotFoundError extends BaseDomainError<{ taskId: string }> {
	readonly errorLabel = "TASK_NOT_FOUND";
	readonly status = 404;
	readonly context: { taskId: string };

	constructor(taskId: string) {
		super();
		this.context = { taskId };
	}
}
