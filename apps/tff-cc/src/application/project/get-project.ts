import type { Project, ProjectStore, Result } from "@tff/core";
import { type DomainError } from "../../infrastructure/errors/generic-domain-error.js";

interface GetProjectDeps {
	projectStore: ProjectStore;
}

export const getProject = async (
	deps: GetProjectDeps,
): Promise<Result<Project | null, DomainError>> => {
	return deps.projectStore.getProject();
};
