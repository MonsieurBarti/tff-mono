import type { GitOps } from "../../domain/ports/git-ops.port.js";
import { Err, Ok, type Result } from "@tff/core";
import {
	GenericDomainError,
	type DomainError,
} from "../../infrastructure/errors/generic-domain-error.js";

export const assertNotOnDefaultBranch = async (
	git: GitOps,
	command: string,
): Promise<Result<void, DomainError>> => {
	const currentR = await git.getCurrentBranch();
	if (!currentR.ok) return currentR;

	const defaultR = await git.detectDefaultBranch();
	if (!defaultR.ok) return defaultR;

	if (currentR.data === defaultR.data) {
		return Err(
			new GenericDomainError(
				"REFUSED_ON_DEFAULT_BRANCH",
				`Refusing to run "${command}" on default branch "${currentR.data}".`,
				{ command, branch: currentR.data },
			),
		);
	}

	return Ok(undefined);
};
