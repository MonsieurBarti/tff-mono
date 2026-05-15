import { describe, it, expect } from "vitest";
import { validateTransition } from "../../src/domain/slice/derived-state.js";
import {
	nextSliceStatus,
	computeSliceStatus,
	type PhaseRun,
	type ArtifactStatus,
} from "../../src/domain/slice/next-slice-status.js";
import { SLICE_TRANSITIONS, SLICE_STATUSES } from "../../src/domain/slice/transitions.js";
import {
	MILESTONE_TRANSITIONS,
	MILESTONE_STATUSES,
} from "../../src/domain/milestone/transitions.js";
import { TASK_TRANSITIONS, TASK_STATUSES } from "../../src/domain/task/transitions.js";
import { TIERS } from "../../src/domain/slice/transitions.js";

describe("validateTransition", () => {
	it("returns ok:true for a valid slice transition", () => {
		const result = validateTransition("created", "discussing", SLICE_TRANSITIONS);
		expect(result).toEqual({ ok: true });
	});

	it("returns ok:false for an invalid slice transition", () => {
		const result = validateTransition("created", "closed", SLICE_TRANSITIONS);
		expect(result).toEqual({
			ok: false,
			violation: {
				code: "INVALID_TRANSITION",
				from: "created",
				to: "closed",
				expected: ["discussing"],
			},
		});
	});

	it("returns ok:true for a valid milestone transition", () => {
		const result = validateTransition("created", "in_progress", MILESTONE_TRANSITIONS);
		expect(result).toEqual({ ok: true });
	});

	it("returns ok:false for an invalid milestone transition", () => {
		const result = validateTransition("in_progress", "created", MILESTONE_TRANSITIONS);
		expect(result).toEqual({
			ok: false,
			violation: {
				code: "INVALID_TRANSITION",
				from: "in_progress",
				to: "created",
				expected: ["completing"],
			},
		});
	});

	it("returns ok:true for a valid task transition", () => {
		const result = validateTransition("open", "in_progress", TASK_TRANSITIONS);
		expect(result).toEqual({ ok: true });
	});

	it("returns ok:false when from status is not in the table", () => {
		const table = { open: ["in_progress"] } as const;
		const result = validateTransition(
			"closed",
			"in_progress",
			table as Record<string, readonly string[]>,
		);
		expect(result).toEqual({
			ok: false,
			violation: {
				code: "INVALID_TRANSITION",
				from: "closed",
				to: "in_progress",
				expected: [],
			},
		});
	});

	it("returns ok:true for a self-loop transition", () => {
		const result = validateTransition("planning", "planning", SLICE_TRANSITIONS);
		expect(result).toEqual({ ok: true });
	});

	it("returns ok:true for discussing→planning", () => {
		const result = validateTransition("discussing", "planning", SLICE_TRANSITIONS);
		expect(result).toEqual({ ok: true });
	});

	it("returns ok:true for shipping→executing", () => {
		const result = validateTransition("shipping", "executing", SLICE_TRANSITIONS);
		expect(result).toEqual({ ok: true });
	});

	it("returns ok:true for every transition defined in SLICE_TRANSITIONS", () => {
		for (const [from, targets] of Object.entries(SLICE_TRANSITIONS)) {
			for (const to of targets) {
				const result = validateTransition(from, to, SLICE_TRANSITIONS);
				expect(result, `transition ${from} → ${to} should be valid`).toEqual({ ok: true });
			}
		}
	});
});

describe("nextSliceStatus", () => {
	const emptyArtifacts: ArtifactStatus = {
		hasSpec: false,
		hasPlan: false,
		hasResearch: false,
		hasVerification: false,
		hasReview: false,
	};

	function makePhaseRun(overrides: Partial<PhaseRun> & { phase: string }): PhaseRun {
		return {
			id: "pr-1",
			sliceId: "sl-1",
			phase: overrides.phase,
			status: overrides.status ?? "completed",
			startedAt: new Date("2024-01-01"),
			finishedAt: new Date("2024-01-02"),
			durationMs: 3600_000,
			error: null,
			feedback: null,
			metadata: null,
			...overrides,
		};
	}

	it("returns discussing from created", () => {
		const result = nextSliceStatus("created", null, [], emptyArtifacts);
		expect(result).toBe("discussing");
	});

	it("returns planning from researching", () => {
		const result = nextSliceStatus("researching", null, [], emptyArtifacts);
		expect(result).toBe("planning");
	});

	it("returns verifying from executing", () => {
		const result = nextSliceStatus("executing", null, [], emptyArtifacts);
		expect(result).toBe("verifying");
	});

	it("returns planning from discussing for S-tier slices", () => {
		const result = nextSliceStatus("discussing", "S", [], emptyArtifacts);
		expect(result).toBe("planning");
	});

	it("returns null at discussing (human gate)", () => {
		const result = nextSliceStatus("discussing", null, [], emptyArtifacts);
		expect(result).toBeNull();
	});

	it("returns null at planning (human gate)", () => {
		const result = nextSliceStatus("planning", null, [], emptyArtifacts);
		expect(result).toBeNull();
	});

	it("returns null at shipping (human gate)", () => {
		const result = nextSliceStatus("shipping", null, [], emptyArtifacts);
		expect(result).toBeNull();
	});

	it("returns null from closed", () => {
		const result = nextSliceStatus("closed", null, [], emptyArtifacts);
		expect(result).toBeNull();
	});

	it("returns reviewing from verifying when last verify phaseRun is completed", () => {
		const phaseRuns = [makePhaseRun({ phase: "verify", status: "completed" })];
		const result = nextSliceStatus("verifying", null, phaseRuns, emptyArtifacts);
		expect(result).toBe("reviewing");
	});

	it("returns executing from verifying when last verify phaseRun is failed", () => {
		const phaseRuns = [makePhaseRun({ phase: "verify", status: "failed" })];
		const result = nextSliceStatus("verifying", null, phaseRuns, emptyArtifacts);
		expect(result).toBe("executing");
	});

	it("returns null from verifying when last verify phaseRun is ambiguous", () => {
		const phaseRuns = [makePhaseRun({ phase: "verify", status: "abandoned" })];
		const result = nextSliceStatus("verifying", null, phaseRuns, emptyArtifacts);
		expect(result).toBeNull();
	});

	it("returns null from verifying when no verify phaseRun exists", () => {
		const result = nextSliceStatus("verifying", null, [], emptyArtifacts);
		expect(result).toBeNull();
	});

	it("returns shipping from reviewing when last review phaseRun is completed", () => {
		const phaseRuns = [makePhaseRun({ phase: "review", status: "completed" })];
		const result = nextSliceStatus("reviewing", null, phaseRuns, emptyArtifacts);
		expect(result).toBe("shipping");
	});

	it("returns executing from reviewing when last review phaseRun is failed", () => {
		const phaseRuns = [makePhaseRun({ phase: "review", status: "failed" })];
		const result = nextSliceStatus("reviewing", null, phaseRuns, emptyArtifacts);
		expect(result).toBe("executing");
	});

	it("returns null from reviewing when no review phaseRun exists", () => {
		const result = nextSliceStatus("reviewing", null, [], emptyArtifacts);
		expect(result).toBeNull();
	});

	it("uses the latest matching phaseRun for verifying", () => {
		const phaseRuns = [
			makePhaseRun({
				phase: "verify",
				status: "failed",
				id: "pr-1",
				startedAt: new Date("2024-01-01"),
			}),
			makePhaseRun({
				phase: "verify",
				status: "completed",
				id: "pr-2",
				startedAt: new Date("2024-01-02"),
			}),
		];
		const result = nextSliceStatus("verifying", null, phaseRuns, emptyArtifacts);
		expect(result).toBe("reviewing");
	});

	it("uses the latest matching phaseRun for reviewing", () => {
		const phaseRuns = [
			makePhaseRun({
				phase: "review",
				status: "completed",
				id: "pr-1",
				startedAt: new Date("2024-01-01"),
			}),
			makePhaseRun({
				phase: "review",
				status: "failed",
				id: "pr-2",
				startedAt: new Date("2024-01-02"),
			}),
		];
		const result = nextSliceStatus("reviewing", null, phaseRuns, emptyArtifacts);
		expect(result).toBe("executing");
	});
});

describe("computeSliceStatus", () => {
	const emptyArtifacts: ArtifactStatus = {
		hasSpec: false,
		hasPlan: false,
		hasResearch: false,
		hasVerification: false,
		hasReview: false,
	};

	function makePhaseRun(overrides: Partial<PhaseRun> & { phase: string }): PhaseRun {
		return {
			id: "pr-1",
			sliceId: "sl-1",
			phase: overrides.phase,
			status: overrides.status ?? "completed",
			startedAt: new Date("2024-01-01"),
			finishedAt: new Date("2024-01-02"),
			durationMs: 3600_000,
			error: null,
			feedback: null,
			metadata: null,
			...overrides,
		};
	}

	it("stays created when there are no phaseRuns", () => {
		const result = computeSliceStatus([], "created", emptyArtifacts);
		expect(result).toBe("created");
	});

	it("maps discuss completed to discussing", () => {
		const phaseRuns = [makePhaseRun({ phase: "discuss" })];
		const result = computeSliceStatus(phaseRuns, "created", emptyArtifacts);
		expect(result).toBe("discussing");
	});

	it("maps research completed to researching", () => {
		const phaseRuns = [makePhaseRun({ phase: "research" })];
		const result = computeSliceStatus(phaseRuns, "discussing", emptyArtifacts);
		expect(result).toBe("researching");
	});

	it("maps plan completed to planning", () => {
		const phaseRuns = [makePhaseRun({ phase: "plan" })];
		const result = computeSliceStatus(phaseRuns, "researching", emptyArtifacts);
		expect(result).toBe("planning");
	});

	it("maps execute completed to executing", () => {
		const phaseRuns = [makePhaseRun({ phase: "execute" })];
		const result = computeSliceStatus(phaseRuns, "planning", emptyArtifacts);
		expect(result).toBe("executing");
	});

	it("maps verify completed to verifying", () => {
		const phaseRuns = [makePhaseRun({ phase: "verify" })];
		const result = computeSliceStatus(phaseRuns, "executing", emptyArtifacts);
		expect(result).toBe("verifying");
	});

	it("maps review completed to reviewing", () => {
		const phaseRuns = [makePhaseRun({ phase: "review" })];
		const result = computeSliceStatus(phaseRuns, "verifying", emptyArtifacts);
		expect(result).toBe("reviewing");
	});

	it("maps ship completed to shipping", () => {
		const phaseRuns = [makePhaseRun({ phase: "ship" })];
		const result = computeSliceStatus(phaseRuns, "reviewing", emptyArtifacts);
		expect(result).toBe("shipping");
	});

	it("stays closed regardless of phaseRuns", () => {
		const phaseRuns = [makePhaseRun({ phase: "execute" })];
		const result = computeSliceStatus(phaseRuns, "closed", emptyArtifacts);
		expect(result).toBe("closed");
	});

	it("returns currentStatus when artifacts exist but no phaseRuns", () => {
		const artifacts: ArtifactStatus = {
			...emptyArtifacts,
			hasPlan: true,
			hasSpec: true,
		};
		const result = computeSliceStatus([], "planning", artifacts);
		expect(result).toBe("planning");
	});

	it("uses the latest completed phaseRun when multiple exist", () => {
		const phaseRuns = [
			makePhaseRun({ phase: "discuss", id: "pr-1", startedAt: new Date("2024-01-01") }),
			makePhaseRun({ phase: "research", id: "pr-2", startedAt: new Date("2024-01-02") }),
		];
		const result = computeSliceStatus(phaseRuns, "created", emptyArtifacts);
		expect(result).toBe("researching");
	});

	it("ignores non-completed phaseRuns", () => {
		const phaseRuns = [
			makePhaseRun({ phase: "execute", status: "started", id: "pr-1" }),
			makePhaseRun({ phase: "discuss", status: "completed", id: "pr-2" }),
		];
		const result = computeSliceStatus(phaseRuns, "created", emptyArtifacts);
		expect(result).toBe("discussing");
	});

	it("ignores abandoned phaseRuns", () => {
		const phaseRuns = [
			makePhaseRun({ phase: "research", status: "abandoned", id: "pr-1" }),
			makePhaseRun({ phase: "discuss", status: "completed", id: "pr-2" }),
		];
		const result = computeSliceStatus(phaseRuns, "created", emptyArtifacts);
		expect(result).toBe("discussing");
	});

	it("ignores retried phaseRuns", () => {
		const phaseRuns = [
			makePhaseRun({ phase: "plan", status: "retried", id: "pr-1" }),
			makePhaseRun({ phase: "discuss", status: "completed", id: "pr-2" }),
		];
		const result = computeSliceStatus(phaseRuns, "created", emptyArtifacts);
		expect(result).toBe("discussing");
	});
});

describe("status constants", () => {
	it("SLICE_STATUSES contains all slice statuses", () => {
		expect(SLICE_STATUSES).toEqual([
			"created",
			"discussing",
			"researching",
			"planning",
			"executing",
			"verifying",
			"reviewing",
			"shipping",
			"closed",
		]);
	});

	it("MILESTONE_STATUSES contains all milestone statuses", () => {
		expect(MILESTONE_STATUSES).toEqual(["created", "in_progress", "completing", "closed"]);
	});

	it("TASK_STATUSES contains all task statuses", () => {
		expect(TASK_STATUSES).toEqual(["open", "in_progress", "closed"]);
	});

	it("TIERS contains all complexity tiers", () => {
		expect(TIERS).toEqual(["S", "SS", "SSS"]);
	});
});
