export type SliceStatus =
	| "created"
	| "discussing"
	| "researching"
	| "planning"
	| "executing"
	| "verifying"
	| "reviewing"
	| "shipping"
	| "closed";

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

export type ComplexityTier = "S" | "SS" | "SSS";

export const TIERS = ["S", "SS", "SSS"] as const;

export const SLICE_TRANSITIONS: Record<SliceStatus, readonly SliceStatus[]> = {
	created: ["discussing"],
	discussing: ["researching", "planning"],
	researching: ["planning"],
	planning: ["planning", "executing"],
	executing: ["verifying"],
	verifying: ["reviewing", "executing"],
	reviewing: ["shipping", "executing"],
	shipping: ["closed", "executing"],
	closed: [],
};

export const HUMAN_GATES: readonly SliceStatus[] = ["discussing", "planning", "shipping"];
