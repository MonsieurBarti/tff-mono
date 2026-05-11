/**
 * Rubric scoring: map Signals to canonical tag set and rank agents by coverage.
 *
 * Minimal local interfaces — the shapes mirror tff-cc value objects but are
 * defined here so core stays self-contained.
 */

export interface AgentCapability {
	id: string;
	handles: string[];
	priority: number;
}

export interface Signals {
	complexity: string;
	risk: {
		level: string;
		tags: string[];
	};
}

export interface WorkflowPool {
	workflow_id: string;
	agents: AgentCapability[];
	default_agent: string;
}

export interface RankedAgent {
	agent: AgentCapability;
	match_ratio: number;
}

/**
 * Project a Signals struct to the canonical tag set used by the rubric.
 * Additive-safe: unknown future Signals fields are ignored.
 */
export const signalsToTagSet = (signals: Signals): Set<string> => {
	const tags = new Set<string>();
	tags.add(`${signals.complexity}_complexity`);
	tags.add(`${signals.risk.level}_risk`);
	for (const t of signals.risk.tags) tags.add(t);
	return tags;
};

/**
 * Score every agent in the pool against the signals using
 * coverage-of-signals normalization: match_ratio = |handles n signals| / |signals|.
 * Ranked by match_ratio DESC, then priority DESC.
 */
export const scoreAgents = (pool: WorkflowPool, signals: Signals): RankedAgent[] => {
	const signalTags = signalsToTagSet(signals);
	const denom = Math.max(signalTags.size, 1);

	const ranked: RankedAgent[] = pool.agents.map((agent) => {
		let matches = 0;
		for (const h of agent.handles) {
			if (signalTags.has(h)) matches++;
		}
		return { agent, match_ratio: matches / denom };
	});

	ranked.sort((a, b) => {
		if (b.match_ratio !== a.match_ratio) return b.match_ratio - a.match_ratio;
		return b.agent.priority - a.agent.priority;
	});
	return ranked;
};
