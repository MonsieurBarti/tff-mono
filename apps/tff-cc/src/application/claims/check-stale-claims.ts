import { Ok, type DomainError, type Result, type Task, type TaskStore } from "@tff/core";

interface CheckStaleClaimsInput {
	ttlMinutes?: number;
}
interface CheckStaleClaimsDeps {
	taskStore: TaskStore;
}
interface CheckStaleClaimsOutput {
	staleClaims: Task[];
}

const DEFAULT_TTL_MINUTES = 30;

export const checkStaleClaims = async (
	input: CheckStaleClaimsInput,
	deps: CheckStaleClaimsDeps,
): Promise<Result<CheckStaleClaimsOutput, DomainError>> => {
	const ttl = input.ttlMinutes ?? DEFAULT_TTL_MINUTES;
	const result = deps.taskStore.listStaleClaims(ttl);
	if (!result.ok) return result;
	return Ok({ staleClaims: result.data });
};
