import type { Result } from "@tff/core";
import type { DomainError } from "../../infrastructure/errors/generic-domain-error.js";

export interface ArtifactStore {
	read(path: string): Promise<Result<string, DomainError>>;
	write(path: string, content: string): Promise<Result<void, DomainError>>;
	exists(path: string): Promise<boolean>;
	list(directory: string): Promise<Result<string[], DomainError>>;
	mkdir(path: string): Promise<Result<void, DomainError>>;
}
