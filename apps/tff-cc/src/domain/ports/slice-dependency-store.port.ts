import type { DomainError, Result } from "@tff/core";

export interface SliceDependency {
	fromId: string;
	toId: string;
}

export interface SliceDependencyStore {
	addSliceDependency(fromId: string, toId: string): Result<void, DomainError>;
	removeSliceDependency(fromId: string, toId: string): Result<void, DomainError>;
	getSliceDependencies(sliceId: string): Result<SliceDependency[], DomainError>;
}
