import { BaseDomainError } from "../shared/base-domain-error.js";

export class ProjectExistsError extends BaseDomainError<{ projectId: string }> {
	readonly errorLabel = "PROJECT_EXISTS";
	readonly code = this.errorLabel;
	readonly status = 409;
	readonly context: { projectId: string };
	readonly message: string;

	constructor(message: string, projectId: string, recoveryHint?: string) {
		super(recoveryHint);
		this.message = message;
		this.context = { projectId };
	}
}
