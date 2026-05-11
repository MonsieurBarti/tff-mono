import type { RoutingOutcome } from "@tff/core";

export interface OutcomeWriter {
	append(outcome: RoutingOutcome): Promise<void>;
}
