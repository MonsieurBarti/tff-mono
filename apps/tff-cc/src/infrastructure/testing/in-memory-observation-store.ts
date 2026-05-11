import type { DomainError } from "../errors/generic-domain-error.js";
import type { ObservationStore } from "../../domain/ports/observation-store.port.js";
import { Ok, type Result, type Observation } from "@tff/core";
import type { Candidate } from "../../shared/value-objects/candidate.js";
import type { Pattern } from "../../shared/value-objects/pattern.js";

export class InMemoryObservationStore implements ObservationStore {
	private observations: Observation[] = [];
	private patterns: Pattern[] = [];
	private candidates: Candidate[] = [];

	async appendObservation(obs: Observation): Promise<Result<void, DomainError>> {
		this.observations.push(obs);
		return Ok(undefined);
	}

	async readObservations(): Promise<Result<Observation[], DomainError>> {
		return Ok([...this.observations]);
	}

	async writePatterns(patterns: Pattern[]): Promise<Result<void, DomainError>> {
		this.patterns = patterns;
		return Ok(undefined);
	}

	async readPatterns(): Promise<Result<Pattern[], DomainError>> {
		return Ok([...this.patterns]);
	}

	async writeCandidates(candidates: Candidate[]): Promise<Result<void, DomainError>> {
		this.candidates = candidates;
		return Ok(undefined);
	}

	async readCandidates(): Promise<Result<Candidate[], DomainError>> {
		return Ok([...this.candidates]);
	}

	reset(): void {
		this.observations = [];
		this.patterns = [];
		this.candidates = [];
	}
}
