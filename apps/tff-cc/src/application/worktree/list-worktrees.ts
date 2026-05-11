import type { GitOps } from "../../domain/ports/git-ops.port.js";
import type { Result } from "@tff/core";
import { type DomainError } from "../../infrastructure/errors/generic-domain-error.js";

interface ListWorktreesDeps {
	gitOps: GitOps;
}

export const listWorktreesUseCase = async (
	deps: ListWorktreesDeps,
): Promise<Result<string[], DomainError>> => {
	return deps.gitOps.listWorktrees();
};
