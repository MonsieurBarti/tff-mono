import { RepositoryPort } from "../shared/repository-port.js";
import type { Milestone } from "./milestone.entity.js";

export abstract class MilestoneRepository extends RepositoryPort<Milestone> {}
