import type { RoutingOutcome } from "../../shared/value-objects/routing-outcome.js";

export interface OutcomeWriter {
	append(outcome: RoutingOutcome): Promise<void>;
}
