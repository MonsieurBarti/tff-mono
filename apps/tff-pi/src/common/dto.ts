import {
	PHASE_VALUES,
	PIPELINE_PHASE_ORDER,
	type SliceStatus,
	type MilestoneStatus,
	type TaskStatus,
	type ComplexityTier as Tier,
} from "@tff/core";
export { PIPELINE_PHASE_ORDER, PHASE_VALUES };
export type { SliceStatus, MilestoneStatus, TaskStatus, Tier };

export type Phase = (typeof PHASE_VALUES)[number] | "ship-fix";

export const ALL_PHASES: Phase[] = [
	"discuss",
	"research",
	"plan",
	"execute",
	"verify",
	"review",
	"ship",
	"ship-fix",
];

export const SIDE_CHANNEL_PHASES: readonly Phase[] = ["ship-fix"];

export const SLICE_STATUSES = [
	"created",
	"discussing",
	"researching",
	"planning",
	"executing",
	"verifying",
	"reviewing",
	"shipping",
	"closed",
] as const;

export const MILESTONE_STATUSES = ["created", "in_progress", "completing", "closed"] as const;
export const TASK_STATUSES = ["open", "in_progress", "closed"] as const;
export const TIERS = ["S", "SS", "SSS"] as const;

export const PHASE_RUN_STATUSES = [
	"started",
	"completed",
	"failed",
	"abandoned",
	"retried",
] as const;
export type PhaseRunStatus = (typeof PHASE_RUN_STATUSES)[number];

export interface Project {
	id: string;
	name: string;
	vision: string;
	createdAt: string;
}

export interface Milestone {
	id: string;
	projectId: string;
	number: number;
	name: string;
	status: MilestoneStatus;
	branch: string;
	createdAt: string;
}

export interface Slice {
	id: string;
	milestoneId: string;
	number: number;
	title: string;
	status: SliceStatus;
	tier: Tier | null;
	prUrl: string | null;
	createdAt: string;
}

export interface Task {
	id: string;
	sliceId: string;
	number: number;
	title: string;
	status: TaskStatus;
	wave: number | null;
	claimedBy: string | null;
	createdAt: string;
}

export interface Dependency {
	fromTaskId: string;
	toTaskId: string;
}

export function taskLabel(taskNumber: number): string {
	return `T${String(taskNumber).padStart(2, "0")}`;
}

export interface ValidateResult {
	valid: boolean;
	error?: string;
}

export function sanitizeForPrompt(input: string): string {
	return input.replace(/```/g, "'''").replace(/^(system|assistant|user):/gim, "$1 -");
}
