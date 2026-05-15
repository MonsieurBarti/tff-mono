import {
	SLICE_TRANSITIONS,
	MILESTONE_TRANSITIONS,
	HUMAN_GATES,
	type SliceStatus,
	type MilestoneStatus,
} from "@tff/core";
import type { Tier } from "./dto.js";

export function canTransitionSlice(from: SliceStatus, to: SliceStatus): boolean {
	return SLICE_TRANSITIONS[from].includes(to);
}

export function canTransitionMilestone(from: MilestoneStatus, to: MilestoneStatus): boolean {
	return MILESTONE_TRANSITIONS[from].includes(to);
}

export function isHumanGate(status: SliceStatus): boolean {
	return HUMAN_GATES.includes(status);
}

export function nextSliceStatus(current: SliceStatus, tier?: Tier): SliceStatus | null {
	if (current === "closed") return null;
	if (current === "discussing" && tier === "S") return "planning";

	const forwardPath: SliceStatus[] = [
		"created",
		"discussing",
		"researching",
		"planning",
		"executing",
		"verifying",
		"reviewing",
		"shipping",
		"closed",
	];

	const idx = forwardPath.indexOf(current);
	if (idx === -1 || idx === forwardPath.length - 1) return null;
	return forwardPath[idx + 1] ?? null;
}
