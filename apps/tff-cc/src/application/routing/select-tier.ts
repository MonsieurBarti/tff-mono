import { randomUUID } from "node:crypto";
import type { RoutingDecisionLogger } from "../../domain/ports/routing-decision-logger.port.js";
import type { TierConfigReader } from "../../domain/ports/tier-config-reader.port.js";
import type { Signals } from "../../shared/value-objects/signals.js";
import type { TierDecision } from "../../shared/value-objects/tier-decision.js";
import {
	Ok,
	isOk,
	resolveEffectiveTier,
	signalsToPolicyTier,
	type BaseDomainError,
	type Result,
} from "@tff/core";

interface SelectTierInput {
	workflow_id: string;
	slice_id: string;
	agent_id: string;
	signals: Signals;
}

interface SelectTierDeps {
	tierConfigReader: TierConfigReader;
	logger: RoutingDecisionLogger;
}

export const selectTierUseCase = async (
	input: SelectTierInput,
	deps: SelectTierDeps,
): Promise<Result<TierDecision, BaseDomainError<unknown>>> => {
	const policyRes = await deps.tierConfigReader.readTierPolicy();
	if (!isOk(policyRes)) return policyRes;

	const minTierRes = await deps.tierConfigReader.readAgentMinTier(input.agent_id);
	if (!isOk(minTierRes)) return minTierRes;

	const policyTier = signalsToPolicyTier(input.signals, policyRes.data);
	const { tier, min_tier_applied } = resolveEffectiveTier(policyTier, minTierRes.data);

	const decision: TierDecision = {
		tier,
		policy_tier: policyTier,
		min_tier_applied,
		agent_id: input.agent_id,
		decision_id: randomUUID(),
		signals: input.signals,
	};

	const logRes = await deps.logger.append({
		kind: "tier",
		timestamp: new Date().toISOString(),
		workflow_id: input.workflow_id,
		slice_id: input.slice_id,
		decision,
	});
	if (!isOk(logRes)) return logRes;

	return Ok(decision);
};
