import { ClaudeCodeFileSystemAdapter } from "./filesystem/claude-code-filesystem.adapter.js";
import { ClaudeCodeGitAdapter } from "./git/claude-code-git.adapter.js";
import { ClaudeCodeAgentAdapter } from "./agent/claude-code-agent.adapter.js";
import { ClaudeCodePromptAdapter } from "./prompt/claude-code-prompt.adapter.js";
import { ClaudeCodeConfigAdapter } from "./config/claude-code-config.adapter.js";
import { ClaudeCodeLifecycleAdapter } from "./lifecycle/claude-code-lifecycle.adapter.js";

export interface Adapters {
	fileSystem: ClaudeCodeFileSystemAdapter;
	gitOperations: ClaudeCodeGitAdapter;
	agentDispatcher: ClaudeCodeAgentAdapter;
	promptLoader: ClaudeCodePromptAdapter;
	configReader: ClaudeCodeConfigAdapter;
	lifecycleManager: ClaudeCodeLifecycleAdapter;
}

export const createAdapters = (repoRoot: string): Adapters => ({
	fileSystem: new ClaudeCodeFileSystemAdapter(),
	gitOperations: new ClaudeCodeGitAdapter(repoRoot),
	agentDispatcher: new ClaudeCodeAgentAdapter(),
	promptLoader: new ClaudeCodePromptAdapter(repoRoot),
	configReader: new ClaudeCodeConfigAdapter(repoRoot),
	lifecycleManager: new ClaudeCodeLifecycleAdapter(),
});
