import type { Observation } from "@tff/core";

interface ClusterOpts {
	minSessions?: number;
	minPatterns?: number;
	maxJaccardDistance?: number;
}

export interface Cluster {
	tools: string[];
	sessions: number;
	activations: number;
}

function jaccardDistance(a: Set<string>, b: Set<string>): number {
	const intersection = new Set([...a].filter((x) => b.has(x)));
	const union = new Set([...a, ...b]);
	if (union.size === 0) return 1;
	return 1 - intersection.size / union.size;
}

export function detectClusters(observations: Observation[], opts: ClusterOpts = {}): Cluster[] {
	const minSessions = opts.minSessions ?? 3;
	const minPatterns = opts.minPatterns ?? 2;
	const maxDist = opts.maxJaccardDistance ?? 0.3;

	const sessionTools = new Map<string, Set<string>>();
	for (const obs of observations) {
		let tools = sessionTools.get(obs.session);
		if (!tools) {
			tools = new Set();
			sessionTools.set(obs.session, tools);
		}
		tools.add(obs.tool);
	}

	if (sessionTools.size < minSessions) return [];

	const allTools = [...new Set(observations.map((o) => o.tool))];

	const toolSessionSets = new Map<string, Set<string>>();
	for (const [session, tools] of sessionTools) {
		for (const tool of tools) {
			let sessions = toolSessionSets.get(tool);
			if (!sessions) {
				sessions = new Set();
				toolSessionSets.set(tool, sessions);
			}
			sessions.add(session);
		}
	}

	// Build co-occurrence counts
	const coOccurrence = new Map<string, number>();
	for (const ts of sessionTools.values()) {
		const tools = [...ts];
		for (let i = 0; i < tools.length; i++) {
			for (let j = i + 1; j < tools.length; j++) {
				const key = [tools[i], tools[j]].sort().join("|");
				coOccurrence.set(key, (coOccurrence.get(key) ?? 0) + 1);
			}
		}
	}

	// Greedy clustering by Jaccard distance
	const clusters: Cluster[] = [];
	const visited = new Set<string>();

	for (const tool of allTools) {
		if (visited.has(tool)) continue;
		const cluster = new Set([tool]);
		visited.add(tool);

		const toolSessions = toolSessionSets.get(tool);
		if (!toolSessions) continue;
		for (const other of allTools) {
			if (visited.has(other)) continue;
			const otherSessions = toolSessionSets.get(other);
			if (!otherSessions) continue;
			const dist = jaccardDistance(toolSessions, otherSessions);
			if (dist < maxDist) {
				cluster.add(other);
				visited.add(other);
			}
		}

		if (cluster.size >= minPatterns) {
			const clusterSessions = new Set<string>();
			for (const t of cluster) {
				const sessions = toolSessionSets.get(t);
				if (!sessions) continue;
				for (const s of sessions) clusterSessions.add(s);
			}
			if (clusterSessions.size >= minSessions) {
				clusters.push({
					tools: [...cluster].sort(),
					sessions: clusterSessions.size,
					activations: [...coOccurrence.entries()]
						.filter(([key]) => {
							const [a, b] = key.split("|");
							return cluster.has(a) && cluster.has(b);
						})
						.reduce((sum, [, count]) => sum + count, 0),
				});
			}
		}
	}

	return clusters.sort((a, b) => b.activations - a.activations);
}
