import type { GitOps } from "../../domain/ports/git-ops.port.js";
import { Err, Ok, refusedOnDefaultBranchError, type DomainError, type Result } from "@tff/core";

export const assertNotOnDefaultBranch = async (
	git: GitOps,
	command: string,
): Promise<Result<void, DomainError>> => {
	const currentR = await git.getCurrentBranch();
	if (!currentR.ok) return currentR;

	const defaultR = await git.detectDefaultBranch();
	if (!defaultR.ok) return defaultR;

	if (currentR.data === defaultR.data) {
		return Err(refusedOnDefaultBranchError(command, currentR.data));
	}

	return Ok(undefined);
};
