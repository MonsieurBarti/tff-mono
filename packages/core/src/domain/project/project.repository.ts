import { RepositoryPort } from "../shared/repository-port.js";
import type { Project } from "./project.entity.js";

export abstract class ProjectRepository extends RepositoryPort<Project> {}
