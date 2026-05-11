import type { Result } from "../shared/result.js";
import type { BaseDomainError } from "../shared/base-domain-error.js";
import type { DomainEvent } from "../shared/domain-event.js";
import type { Slice } from "../slice/slice.entity.js";
import type { SliceKind } from "../slice/slice-kind.js";
import type { SliceStatus } from "../slice/transitions.js";
import type { SliceProps, SliceUpdateProps } from "../slice/slice-props.js";

export interface SliceStore {
	createSlice(props: SliceProps): Result<Slice, BaseDomainError<unknown>>;
	getSlice(id: string): Result<Slice | null, BaseDomainError<unknown>>;
	getSliceByNumbers(
		milestoneNumber: number,
		sliceNumber: number,
	): Result<Slice | null, BaseDomainError<unknown>>;
	listSlices(
		milestoneIdOrOptions?: string | { milestoneId?: string; includeArchived?: boolean },
	): Result<Slice[], BaseDomainError<unknown>>;
	listSlicesByKind(
		kind: SliceKind,
		options?: { includeArchived?: boolean },
	): Result<Slice[], BaseDomainError<unknown>>;
	updateSlice(id: string, updates: SliceUpdateProps): Result<void, BaseDomainError<unknown>>;
	transitionSlice(
		id: string,
		target: SliceStatus,
	): Result<DomainEvent<unknown>[], BaseDomainError<unknown>>;
	archiveSlice(id: string): Result<void, BaseDomainError<unknown>>;
}
