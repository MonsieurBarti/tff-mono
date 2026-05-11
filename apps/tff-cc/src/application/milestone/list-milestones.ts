import type { DomainError, Milestone, MilestoneStore, Result } from "@tff/core";

interface ListMilestonesDeps {
	milestoneStore: MilestoneStore;
}

export const listMilestones = async (
	deps: ListMilestonesDeps,
): Promise<Result<Milestone[], DomainError>> => {
	return deps.milestoneStore.listMilestones();
};
