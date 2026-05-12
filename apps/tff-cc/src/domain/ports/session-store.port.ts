import type { Result } from "@tff/core";
import type { DomainError } from "../../infrastructure/errors/generic-domain-error.js";
import type { WorkflowSession } from "../../shared/value-objects/workflow-session.js";

export interface SessionStore {
	getSession(): Result<WorkflowSession | null, DomainError>;
	saveSession(session: WorkflowSession): Result<void, DomainError>;
}
