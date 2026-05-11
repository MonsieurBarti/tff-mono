import type { GitOps } from "../../domain/ports/git-ops.port.js";
import type { DomainError, Result } from "@tff/core";

interface ListWorktreesDeps {
	gitOps: GitOps;
}

export const listWorktreesUseCase = async (
	deps: ListWorktreesDeps,
): Promise<Result<string[], DomainError>> => {
	return deps.gitOps.listWorktrees();
};
