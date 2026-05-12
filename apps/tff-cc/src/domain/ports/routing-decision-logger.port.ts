import type { Result } from "@tff/core";
import type { DomainError } from "../../infrastructure/errors/generic-domain-error.js";
import type { RoutingDecision } from "../../shared/value-objects/routing-decision.js";
import type { Signals } from "../../shared/value-objects/signals.js";
import type { TierDecision } from "../../shared/value-objects/tier-decision.js";

export interface SignalExtractionLogEntry {
	kind: "extract";
	timestamp: string;
	workflow_id: string;
	slice_id: string;
	deterministic_signals: Signals;
	duration_ms: number;
}

export interface RoutingDecisionLogEntry {
	kind: "route";
	timestamp: string;
	workflow_id: string;
	slice_id: string;
	decision: RoutingDecision;
}

export interface TierDecisionLogEntry {
	kind: "tier";
	timestamp: string;
	workflow_id: string;
	slice_id: string;
	decision: TierDecision;
}

export interface DebugEventLogEntry {
	kind: "debug";
	timestamp: string;
	workflow_id: string;
	slice_id: string;
}

export type RoutingLogEntry =
	| SignalExtractionLogEntry
	| RoutingDecisionLogEntry
	| TierDecisionLogEntry
	| DebugEventLogEntry;

export interface RoutingDecisionLogger {
	append(entry: RoutingLogEntry): Promise<Result<void, DomainError>>;
}
