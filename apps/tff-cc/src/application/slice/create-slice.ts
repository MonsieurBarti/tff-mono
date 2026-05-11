import {
	Err,
	Ok,
	PreconditionViolationError,
	isOk,
	milestoneLabel,
	sliceDir as sliceDirPath,
	sliceLabel,
	type BaseDomainError,
	type MilestoneStore,
	type Result,
	type Slice,
	type SliceStore,
} from "@tff/core";
import type { ArtifactStore } from "../../domain/ports/artifact-store.port.js";

interface CreateSliceInput {
	milestoneId: string;
	title: string;
}

interface CreateSliceDeps {
	milestoneStore: MilestoneStore;
	sliceStore: SliceStore;
	artifactStore: ArtifactStore;
}

interface CreateSliceOutput {
	slice: Slice;
}

export const createSliceUseCase = async (
	input: CreateSliceInput,
	deps: CreateSliceDeps,
): Promise<Result<CreateSliceOutput, BaseDomainError<unknown>>> => {
	const milestoneResult = deps.milestoneStore.getMilestone(input.milestoneId);
	if (!isOk(milestoneResult)) return milestoneResult;
	const milestone = milestoneResult.data;
	if (!milestone) {
		return Err(
			new PreconditionViolationError(`Milestone "${input.milestoneId}" not found`, ["NOT_FOUND"]),
		);
	}

	const existingSlicesResult = deps.sliceStore.listSlices(input.milestoneId);
	if (!isOk(existingSlicesResult)) return existingSlicesResult;
	const sliceNumber = existingSlicesResult.data.length + 1;

	const sliceResult = deps.sliceStore.createSlice({
		milestoneId: input.milestoneId,
		number: sliceNumber,
		title: input.title,
	});
	if (!isOk(sliceResult)) return sliceResult;
	const slice = sliceResult.data;

	// Create slice directory with stub PLAN.md using label format
	const msLabel = milestoneLabel(milestone.number);
	const slLabel = sliceLabel(milestone.number, slice.number);
	const dir = sliceDirPath(msLabel, slLabel);
	await deps.artifactStore.mkdir(dir);
	await deps.artifactStore.write(
		`${dir}/PLAN.md`,
		`# Plan — ${slLabel}: ${input.title}\n\n_Plan will be defined during /tff:plan._\n`,
	);

	return Ok({ slice });
};
