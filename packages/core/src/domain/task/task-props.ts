export type Difficulty = "low" | "medium" | "high";

export interface TaskProps {
	sliceId: string;
	number: number;
	title: string;
	description?: string;
	wave?: number;
	difficulty?: Difficulty;
}

export interface TaskUpdateProps {
	title?: string;
	description?: string;
	wave?: number;
	difficulty?: Difficulty;
}
