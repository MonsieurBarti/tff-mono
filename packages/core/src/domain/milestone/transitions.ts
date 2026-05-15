export type MilestoneStatus = "created" | "in_progress" | "completing" | "closed";

export const MILESTONE_STATUSES = ["created", "in_progress", "completing", "closed"] as const;

export const MILESTONE_TRANSITIONS: Record<MilestoneStatus, readonly MilestoneStatus[]> = {
	created: ["in_progress"],
	in_progress: ["completing"],
	completing: ["closed"],
	closed: [],
};
