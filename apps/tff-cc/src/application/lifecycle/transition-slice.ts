import type { EventBus } from "../../domain/ports/event-bus.port.js";
import type { SliceStatus } from "../../shared/value-objects/slice-status.js";
import {
	Err,
	createDomainError,
	isOk,
	type DomainError,
	type DomainEvent,
	type Result,
	type Slice,
	type SliceStore,
} from "@tff/core";

interface TransitionInput {
	sliceId: string;
	targetStatus: SliceStatus;
}
interface TransitionDeps {
	sliceStore: SliceStore;
	eventBus?: EventBus;
}
interface TransitionOutput {
	slice: Slice;
	events: DomainEvent[];
}

export const transitionSliceUseCase = async (
	input: TransitionInput,
	deps: TransitionDeps,
): Promise<Result<TransitionOutput, DomainError>> => {
	const transitionResult = deps.sliceStore.transitionSlice(input.sliceId, input.targetStatus);
	if (!isOk(transitionResult)) return transitionResult;

	if (deps.eventBus) {
		for (const event of transitionResult.data) {
			deps.eventBus.publish(event);
		}
	}

	const sliceResult = deps.sliceStore.getSlice(input.sliceId);
	if (!isOk(sliceResult)) return sliceResult;
	if (!sliceResult.data) {
		return Err(
			createDomainError("NOT_FOUND", `Slice "${input.sliceId}" not found after transition`),
		);
	}

	return { ok: true, data: { slice: sliceResult.data, events: transitionResult.data } };
};
