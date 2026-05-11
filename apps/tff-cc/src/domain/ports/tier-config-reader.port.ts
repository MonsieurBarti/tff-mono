import type { Result } from "@tff/core";
import type { DomainError } from "../../infrastructure/errors/generic-domain-error.js";
import type { RiskLevel } from "../../shared/value-objects/signals.js";
import type { ModelTier } from "../../shared/value-objects/tier-decision.js";

export const DEFAULT_TIER_POLICY: Record<RiskLevel, ModelTier> = {
	low: "haiku",
	medium: "sonnet",
	high: "opus",
};

export interface TierConfigReader {
	readTierPolicy(): Promise<Result<Record<RiskLevel, ModelTier>, DomainError>>;
	readAgentMinTier(agent_id: string): Promise<Result<ModelTier, DomainError>>;
}
