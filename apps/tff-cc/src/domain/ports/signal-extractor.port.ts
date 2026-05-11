import type { DomainError, Result } from "@tff/core";
import type { Signals } from "../../shared/value-objects/signals.js";

export interface ExtractInput {
	slice_id: string;
	spec_path?: string;
	affected_files: string[];
	description: string;
}

export interface SignalExtractor {
	extract(input: ExtractInput): Promise<Result<Signals, DomainError>>;
}
