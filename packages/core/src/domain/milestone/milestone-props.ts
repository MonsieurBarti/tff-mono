import type { MilestoneStatus } from "./transitions.js";

export interface MilestoneProps {
	number: number;
	name: string;
	id?: string;
	branch?: string;
}

export interface MilestoneUpdateProps {
	name?: string;
	status?: MilestoneStatus;
}
