import type { DomainError, Project, ProjectStore, Result } from "@tff/core";

interface GetProjectDeps {
	projectStore: ProjectStore;
}

export const getProject = async (
	deps: GetProjectDeps,
): Promise<Result<Project | null, DomainError>> => {
	return deps.projectStore.getProject();
};
