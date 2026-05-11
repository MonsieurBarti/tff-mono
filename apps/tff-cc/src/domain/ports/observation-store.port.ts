import type { DomainError, Result } from "@tff/core";
import type { Candidate } from "../../shared/value-objects/candidate.js";
import type { Observation } from "../../shared/value-objects/observation.js";
import type { Pattern } from "../../shared/value-objects/pattern.js";

export interface ObservationStore {
	appendObservation(obs: Observation): Promise<Result<void, DomainError>>;
	readObservations(): Promise<Result<Observation[], DomainError>>;
	writePatterns(patterns: Pattern[]): Promise<Result<void, DomainError>>;
	readPatterns(): Promise<Result<Pattern[], DomainError>>;
	writeCandidates(candidates: Candidate[]): Promise<Result<void, DomainError>>;
	readCandidates(): Promise<Result<Candidate[], DomainError>>;
}
