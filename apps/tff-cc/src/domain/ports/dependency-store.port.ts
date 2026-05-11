import type { DomainError, Result } from "@tff/core";
import type { Dependency } from "../../shared/value-objects/dependency.js";

export interface DependencyStore {
	addDependency(fromId: string, toId: string, type: "blocks"): Result<void, DomainError>;
	removeDependency(fromId: string, toId: string): Result<void, DomainError>;
	getDependencies(taskId: string): Result<Dependency[], DomainError>;
}
