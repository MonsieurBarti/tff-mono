/**
 * Tier resolution helpers: compute effective tier from signals + policy.
 *
 * Minimal local interfaces — the shapes mirror tff-cc value objects but are
 * defined here so core stays self-contained.
 */

export type ComplexityLevel = "low" | "medium" | "high";
export type RiskLevel = "low" | "medium" | "high";
export type ModelTier = "haiku" | "sonnet" | "opus";

export const TIER_ORDER: Record<ModelTier, number> = { haiku: 0, sonnet: 1, opus: 2 };

export interface Signals {
	complexity: ComplexityLevel;
	risk: {
		level: RiskLevel;
	};
}

export const signalsToPolicyTier = (
	signals: Signals,
	policy: Record<ComplexityLevel | RiskLevel, ModelTier>,
): ModelTier => {
	const ct = policy[signals.complexity];
	const rt = policy[signals.risk.level];
	return TIER_ORDER[ct] >= TIER_ORDER[rt] ? ct : rt;
};

export const resolveEffectiveTier = (
	policyTier: ModelTier,
	minTier: ModelTier,
): { tier: ModelTier; min_tier_applied: boolean } => {
	if (TIER_ORDER[policyTier] >= TIER_ORDER[minTier]) {
		return { tier: policyTier, min_tier_applied: false };
	}
	return { tier: minTier, min_tier_applied: true };
};
