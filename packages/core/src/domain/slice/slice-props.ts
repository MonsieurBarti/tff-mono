import type { SliceKind } from "./slice-kind.js";
import type { ComplexityTier } from "./transitions.js";

export interface SliceProps {
	milestoneId?: string;
	kind?: SliceKind;
	number: number;
	title: string;
	tier?: ComplexityTier;
	baseBranch?: string;
	branchName?: string;
	id?: string;
}

export interface SliceUpdateProps {
	title?: string;
	tier?: ComplexityTier;
}
