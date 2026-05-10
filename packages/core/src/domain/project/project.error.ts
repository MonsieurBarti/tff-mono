import { BaseDomainError } from "../shared/base-domain-error.js";

export class ProjectExistsError extends BaseDomainError<{ projectId: string }> {
	readonly errorLabel = "PROJECT_EXISTS";
	readonly status = 409;
	readonly context: { projectId: string };

	constructor(projectId: string) {
		super();
		this.context = { projectId };
	}
}
