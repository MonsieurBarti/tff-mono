export type TaskStatus = "open" | "in_progress" | "closed";

export const TASK_STATUSES = ["open", "in_progress", "closed"] as const;

export const TASK_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
	open: ["in_progress"],
	in_progress: ["closed"],
	closed: [],
};
