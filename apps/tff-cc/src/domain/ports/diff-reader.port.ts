import type { Result } from "@tff/core";
import type { DomainError } from "../../infrastructure/errors/generic-domain-error.js";

export interface DiffSummary {
	files_changed: number;
	insertions: number;
	deletions: number;
	patch: string;
	truncated: boolean;
}

export interface DiffReader {
	/** Read the diff introduced by a merge commit, truncating the patch to `maxPatchBytes`. */
	readMergeDiff(mergeSha: string, maxPatchBytes: number): Promise<Result<DiffSummary, DomainError>>;
}
