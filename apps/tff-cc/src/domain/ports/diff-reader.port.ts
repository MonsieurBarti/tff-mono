import type { DomainError, Result } from "@tff/core";

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
