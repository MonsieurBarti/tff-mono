import type { GitOps } from "../../domain/ports/git-ops.port.js";
import { worktreeDir, type Result } from "@tff/core";
import { type DomainError } from "../../infrastructure/errors/generic-domain-error.js";

interface DeleteWorktreeInput {
	sliceId: string;
}
interface DeleteWorktreeDeps {
	gitOps: GitOps;
}

export const deleteWorktreeUseCase = async (
	input: DeleteWorktreeInput,
	deps: DeleteWorktreeDeps,
): Promise<Result<void, DomainError>> => {
	const worktreePath = worktreeDir(input.sliceId);
	return deps.gitOps.deleteWorktree(worktreePath);
};
