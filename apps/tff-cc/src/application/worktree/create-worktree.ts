import type { GitOps } from "../../domain/ports/git-ops.port.js";
import {
	Ok,
	isOk,
	sliceLabelFor,
	worktreeDir,
	type Milestone,
	type Result,
	type Slice,
} from "@tff/core";
import { type DomainError } from "../../infrastructure/errors/generic-domain-error.js";

interface CreateWorktreeInput {
	slice: Slice;
	milestone?: Milestone;
	startPoint: string;
	branchName: string;
}
interface CreateWorktreeDeps {
	gitOps: GitOps;
}
interface CreateWorktreeOutput {
	worktreePath: string;
	branchName: string;
}

export const createWorktreeUseCase = async (
	input: CreateWorktreeInput,
	deps: CreateWorktreeDeps,
): Promise<Result<CreateWorktreeOutput, DomainError>> => {
	const { slice, milestone, startPoint, branchName } = input;

	// Worktree path uses human-readable label format (M##-S## | Q-## | D-##).
	const label = sliceLabelFor(slice, milestone);
	const worktreePath = worktreeDir(label);

	const result = await deps.gitOps.createWorktree(worktreePath, branchName, startPoint);
	if (!isOk(result)) return result;

	return Ok({ worktreePath, branchName });
};
