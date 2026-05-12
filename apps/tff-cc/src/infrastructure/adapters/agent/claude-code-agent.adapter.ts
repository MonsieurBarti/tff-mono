import { Err, ContractError } from "@tff/core";
import type { AgentDispatcher, SpawnOptions } from "@tff/core";

export class ClaudeCodeAgentAdapter implements AgentDispatcher {
	async spawn(_task: string, _options?: SpawnOptions) {
		return Err(
			new ContractError(
				"Agent dispatch requires Claude Code plugin context",
				"AgentDispatcher",
				"spawn",
				"AgentDispatcher is not available in CLI runtime",
			),
		);
	}
}
