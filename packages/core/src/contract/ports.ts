import type { Result } from "../domain/shared/result.js";
import { BaseDomainError } from "../domain/shared/base-domain-error.js";
import type {
	ContentKind,
	SpawnOptions,
	AgentResult,
	FileSystemEntry,
	GitCommitInfo,
} from "./types.js";

export class ContractError extends BaseDomainError<{
	port: string;
	operation: string;
	cause?: string | undefined;
}> {
	readonly errorLabel = "CONTRACT_ERROR";
	readonly status = 500;
	readonly context: { port: string; operation: string; cause?: string | undefined };

	constructor(port: string, operation: string, cause?: string) {
		super();
		this.context = { port, operation, cause };
	}
}

export interface FileSystem {
	readFile(path: string): Promise<Result<string, ContractError>>;
	writeFile(path: string, content: string): Promise<Result<void, ContractError>>;
	exists(path: string): Promise<Result<boolean, ContractError>>;
	mkdir(path: string, recursive?: boolean): Promise<Result<void, ContractError>>;
	readdir(path: string): Promise<Result<FileSystemEntry[], ContractError>>;
}

export interface GitOperations {
	createBranch(name: string, base?: string): Promise<Result<void, ContractError>>;
	createWorktree(path: string, branch: string): Promise<Result<void, ContractError>>;
	deleteWorktree(path: string): Promise<Result<void, ContractError>>;
	commit(message: string, files?: string[]): Promise<Result<GitCommitInfo, ContractError>>;
	getCurrentBranch(): Promise<Result<string, ContractError>>;
	branchExists(name: string): Promise<Result<boolean, ContractError>>;
	pushBranch(name: string, remote?: string): Promise<Result<void, ContractError>>;
	detectDefaultBranch(): Promise<Result<string, ContractError>>;
	lsTree(branch: string, path?: string): Promise<Result<FileSystemEntry[], ContractError>>;
	extractFile(branch: string, path: string): Promise<Result<string, ContractError>>;
}

export interface AgentDispatcher {
	spawn(
		task: string,
		options?: SpawnOptions,
	): Promise<Result<AgentResult | AgentResult[], ContractError>>;
}

export interface PromptLoader {
	load(kind: ContentKind, name: string): Promise<Result<string, ContractError>>;
}

export interface ConfigReader {
	readConfig(keyPath?: string): Promise<Result<unknown, ContractError>>;
}

export interface LifecycleManager {
	onSessionStart(handler: () => Promise<void> | void): Promise<Result<void, ContractError>>;
	onSessionShutdown(handler: () => Promise<void> | void): Promise<Result<void, ContractError>>;
}
