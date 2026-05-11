import type { Result } from "../shared/result.js";
import type { BaseDomainError } from "../shared/base-domain-error.js";
import type { Task } from "../task/task.entity.js";
import type { TaskProps, TaskUpdateProps } from "../task/task-props.js";

export interface TaskStore {
	createTask(props: TaskProps): Result<Task, BaseDomainError<unknown>>;
	getTask(id: string): Result<Task | null, BaseDomainError<unknown>>;
	listTasks(sliceId: string): Result<Task[], BaseDomainError<unknown>>;
	updateTask(id: string, updates: TaskUpdateProps): Result<void, BaseDomainError<unknown>>;
	claimTask(id: string, claimedBy?: string): Result<void, BaseDomainError<unknown>>;
	closeTask(id: string, reason?: string): Result<void, BaseDomainError<unknown>>;
	listReadyTasks(sliceId: string): Result<Task[], BaseDomainError<unknown>>;
	listStaleClaims(ttlMinutes: number): Result<Task[], BaseDomainError<unknown>>;
	getExecutorsForSlice(sliceId: string): Result<string[], BaseDomainError<unknown>>;
}
