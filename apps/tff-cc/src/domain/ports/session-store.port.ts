import type { DomainError, Result } from "@tff/core";
import type { WorkflowSession } from "../../shared/value-objects/workflow-session.js";

export interface SessionStore {
	getSession(): Result<WorkflowSession | null, DomainError>;
	saveSession(session: WorkflowSession): Result<void, DomainError>;
}
