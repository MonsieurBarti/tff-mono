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

export type ComplexityTier = "S" | "SS" | "SSS";

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
