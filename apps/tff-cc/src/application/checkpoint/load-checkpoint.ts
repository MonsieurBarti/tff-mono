import type { ArtifactStore } from "../../domain/ports/artifact-store.port.js";
import type { CheckpointData } from "./save-checkpoint.js";
import {
	Err,
	Ok,
	createDomainError,
	isOk,
	sliceDir,
	type DomainError,
	type Result,
} from "@tff/core";

interface LoadCheckpointDeps {
	artifactStore: ArtifactStore;
}

export const loadCheckpoint = async (
	sliceId: string,
	deps: LoadCheckpointDeps,
): Promise<Result<CheckpointData, DomainError>> => {
	const milestoneId = sliceId.match(/^(M\d+)/)?.[1] ?? "M01";
	const path = `${sliceDir(milestoneId, sliceId)}/CHECKPOINT.md`;
	const contentResult = await deps.artifactStore.read(path);
	if (!isOk(contentResult))
		return Err(
			createDomainError("NOT_FOUND", `No checkpoint found for slice "${sliceId}"`, { sliceId }),
		);

	const match = contentResult.data.match(/<!-- checkpoint-json: (.+) -->/);
	if (!match)
		return Err(
			createDomainError("VALIDATION_ERROR", `Checkpoint file for "${sliceId}" is corrupted`, {
				sliceId,
			}),
		);

	const data = JSON.parse(match[1]) as CheckpointData;
	return Ok(data);
};
