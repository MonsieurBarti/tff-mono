import { SLICE_TRANSITIONS, HUMAN_GATES, type SliceStatus } from "./transitions.js";

export interface PhaseRun {
	id: string;
	sliceId: string;
	phase: string;
	status: "started" | "completed" | "failed" | "abandoned" | "retried";
	startedAt: Date;
	finishedAt: Date | null;
	durationMs: number | null;
	error: string | null;
	feedback: string | null;
	metadata: Record<string, unknown> | null;
}

export interface ArtifactStatus {
	hasSpec: boolean;
	hasPlan: boolean;
	hasResearch: boolean;
	hasVerification: boolean;
	hasReview: boolean;
}

const PHASE_TO_STATUS: Record<string, SliceStatus> = {
	discuss: "discussing",
	research: "researching",
	plan: "planning",
	execute: "executing",
	verify: "verifying",
	review: "reviewing",
	ship: "shipping",
};

export function nextSliceStatus(
	current: SliceStatus,
	_tier: "S" | "SS" | "SSS" | null,
	phaseRuns: PhaseRun[],
	_artifacts: ArtifactStatus,
): SliceStatus | null {
	const transitions = SLICE_TRANSITIONS[current];
	if (transitions.length === 0) {
		return null;
	}
	if (HUMAN_GATES.includes(current)) {
		return null;
	}
	if (transitions.length === 1) {
		return transitions[0] ?? null;
	}

	if (current === "verifying") {
		const last = findLastPhaseRun(phaseRuns, "verify");
		if (last?.status === "completed") {
			return "reviewing";
		}
		if (last?.status === "failed") {
			return "executing";
		}
		return null;
	}

	if (current === "reviewing") {
		const last = findLastPhaseRun(phaseRuns, "review");
		if (last?.status === "completed") {
			return "shipping";
		}
		if (last?.status === "failed") {
			return "executing";
		}
		return null;
	}

	return null;
}

export function computeSliceStatus(
	phaseRuns: PhaseRun[],
	currentStatus: SliceStatus,
	_artifacts: ArtifactStatus,
): SliceStatus {
	if (currentStatus === "created" && phaseRuns.length === 0) {
		return "created";
	}
	if (currentStatus === "closed") {
		return "closed";
	}

	const completed = phaseRuns.filter((pr) => pr.status === "completed");
	if (completed.length === 0) {
		return currentStatus;
	}

	const sorted = completed.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
	const latest = sorted[0];
	if (latest === undefined) {
		return currentStatus;
	}

	return PHASE_TO_STATUS[latest.phase] ?? currentStatus;
}

function findLastPhaseRun(phaseRuns: PhaseRun[], phase: string): PhaseRun | undefined {
	const matching = phaseRuns.filter((pr) => pr.phase === phase);
	if (matching.length === 0) {
		return undefined;
	}
	return matching.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];
}
