import type { Milestone, MilestoneStore, Result } from "@tff/core";
import { type DomainError } from "../../infrastructure/errors/generic-domain-error.js";

interface ListMilestonesDeps {
	milestoneStore: MilestoneStore;
}

export const listMilestones = async (
	deps: ListMilestonesDeps,
): Promise<Result<Milestone[], DomainError>> => {
	return deps.milestoneStore.listMilestones();
};
