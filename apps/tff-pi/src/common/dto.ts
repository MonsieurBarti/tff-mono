import {
	PHASE_VALUES,
	PIPELINE_PHASE_ORDER,
	SLICE_STATUSES,
	MILESTONE_STATUSES,
	TASK_STATUSES,
	TIERS,
	type SliceStatus,
	type MilestoneStatus,
	type TaskStatus,
	type ComplexityTier as Tier,
} from "@tff/core";
export {
	PIPELINE_PHASE_ORDER,
	PHASE_VALUES,
	SLICE_STATUSES,
	MILESTONE_STATUSES,
	TASK_STATUSES,
	TIERS,
};
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
	updatedAt?: string | null;
}

export interface Milestone {
	id: string;
	projectId: string;
	number: number;
	name: string;
	status: MilestoneStatus;
	branch: string;
	closeReason?: string | null;
	createdAt: string;
	updatedAt?: string | null;
	archivedAt?: string | null;
}

export interface Slice {
	id: string;
	milestoneId: string;
	kind?: string;
	number: number;
	title: string;
	status: SliceStatus;
	tier: Tier | null;
	baseBranch?: string;
	branchName?: string;
	prUrl: string | null;
	createdAt: string;
	updatedAt?: string | null;
	archivedAt?: string | null;
}

export interface Task {
	id: string;
	sliceId: string;
	number: number;
	title: string;
	description?: string | null;
	status: TaskStatus;
	wave: number | null;
	claimedAt?: string | null;
	claimedBy: string | null;
	closedReason?: string | null;
	createdAt: string;
	updatedAt?: string | null;
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
