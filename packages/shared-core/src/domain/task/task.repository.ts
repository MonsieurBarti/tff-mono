import { RepositoryPort } from "../shared/repository-port.js";
import type { Task } from "./task.entity.js";

export abstract class TaskRepository extends RepositoryPort<Task> {}
