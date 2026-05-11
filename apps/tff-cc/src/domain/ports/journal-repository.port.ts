import type { DomainError, Result } from "@tff/core";
import type { JournalEntry } from "../../shared/value-objects/journal-entry.js";

export interface JournalRepository {
	append(sliceId: string, entry: Omit<JournalEntry, "seq">): Result<number, DomainError>;
	readAll(sliceId: string): Result<readonly JournalEntry[], DomainError>;
	readSince(sliceId: string, afterSeq: number): Result<readonly JournalEntry[], DomainError>;
	count(sliceId: string): Result<number, DomainError>;
}
