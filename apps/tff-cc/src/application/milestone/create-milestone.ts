import type { ArtifactStore } from "../../domain/ports/artifact-store.port.js";
import type { GitOps } from "../../domain/ports/git-ops.port.js";
import {
	Ok,
	isOk,
	milestoneDir as milestoneDirPath,
	milestoneLabel,
	type DomainError,
	type Milestone,
	type MilestoneStore,
	type Result,
} from "@tff/core";

interface CreateMilestoneInput {
	name: string;
	number: number;
}

interface CreateMilestoneDeps {
	milestoneStore: MilestoneStore;
	artifactStore: ArtifactStore;
	gitOps: GitOps;
}

interface CreateMilestoneOutput {
	milestone: Milestone;
	branchName: string;
}

export const createMilestoneUseCase = async (
	input: CreateMilestoneInput,
	deps: CreateMilestoneDeps,
): Promise<Result<CreateMilestoneOutput, DomainError>> => {
	// Persist milestone in store (generates UUID and branch)
	const milestoneResult = deps.milestoneStore.createMilestone({
		number: input.number,
		name: input.name,
	});
	if (!isOk(milestoneResult)) return milestoneResult;

	const milestone = milestoneResult.data;
	const branchName = milestone.branch;

	// Create branch
	await deps.gitOps.createBranch(branchName, "main");

	// Create milestone directory with REQUIREMENTS.md using label format
	const label = milestoneLabel(input.number);
	const dir = milestoneDirPath(label);
	await deps.artifactStore.mkdir(`${dir}/slices`);
	await deps.artifactStore.write(
		`${dir}/REQUIREMENTS.md`,
		`# Requirements — ${input.name}\n\n_Define your requirements here._\n`,
	);

	return Ok({ milestone, branchName });
};
