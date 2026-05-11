import type { Result } from "../shared/result.js";
import type { BaseDomainError } from "../shared/base-domain-error.js";
import type { Project } from "../project/project.entity.js";
import type { ProjectProps } from "../project/project-props.js";

export interface ProjectStore {
	getProject(): Result<Project | null, BaseDomainError<unknown>>;
	saveProject(props: ProjectProps): Result<Project, BaseDomainError<unknown>>;
}
