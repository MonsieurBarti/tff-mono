import type { OutcomeSourceKind, RoutingOutcome } from "@tff/core";

export interface OutcomeReadFilter {
	since?: string;
	source?: OutcomeSourceKind;
	decision_id?: string;
}

export interface OutcomeSource {
	readOutcomes(filter: OutcomeReadFilter): AsyncIterable<RoutingOutcome>;
}
