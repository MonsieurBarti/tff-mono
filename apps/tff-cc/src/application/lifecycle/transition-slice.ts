import type { EventBus } from "../../domain/ports/event-bus.port.js";
import {
	Err,
	isOk,
	type DomainEvent,
	type Result,
	type Slice,
	type SliceStatus,
	type SliceStore,
} from "@tff/core";
import {
	GenericDomainError,
	type DomainError,
} from "../../infrastructure/errors/generic-domain-error.js";

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
	events: DomainEvent<unknown>[];
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
			new GenericDomainError("NOT_FOUND", `Slice "${input.sliceId}" not found after transition`),
		);
	}

	return { ok: true, data: { slice: sliceResult.data, events: transitionResult.data } };
};
