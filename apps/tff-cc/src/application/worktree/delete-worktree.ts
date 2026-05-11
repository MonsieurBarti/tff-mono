import type { GitOps } from "../../domain/ports/git-ops.port.js";
import { worktreeDir, type DomainError, type Result } from "@tff/core";

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
