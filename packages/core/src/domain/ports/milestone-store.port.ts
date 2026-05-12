import type { Result } from "../shared/result.js";
import type { BaseDomainError } from "../shared/base-domain-error.js";
import type { Milestone } from "../milestone/milestone.entity.js";
import type { MilestoneProps, MilestoneUpdateProps } from "../milestone/milestone-props.js";

export interface MilestoneStore {
	createMilestone(props: MilestoneProps): Result<Milestone, BaseDomainError<unknown>>;
	getMilestone(id: string): Result<Milestone | null, BaseDomainError<unknown>>;
	getMilestoneByNumber(number: number): Result<Milestone | null, BaseDomainError<unknown>>;
	listMilestones(options?: {
		includeArchived?: boolean;
	}): Result<Milestone[], BaseDomainError<unknown>>;
	updateMilestone(
		id: string,
		updates: MilestoneUpdateProps,
	): Result<void, BaseDomainError<unknown>>;
	closeMilestone(id: string, reason?: string): Result<void, BaseDomainError<unknown>>;
	archiveMilestoneCascade(id: string): Result<{ slicesArchived: number }, BaseDomainError<unknown>>;
}
