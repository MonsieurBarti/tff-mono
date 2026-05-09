import { z } from "zod";

export const ContentKindSchema = z.enum(["agent", "skill", "workflow", "protocol", "command"]);
export type ContentKind = z.infer<typeof ContentKindSchema>;

export const SpawnModeSchema = z.enum(["single", "parallel"]);
export type SpawnMode = z.infer<typeof SpawnModeSchema>;

export const SpawnOptionsSchema = z.object({
	mode: SpawnModeSchema,
	concurrency: z.number().int().min(1).max(10).optional(),
});
export type SpawnOptions = z.infer<typeof SpawnOptionsSchema>;

export const AgentResultSchema = z.object({
	status: z.enum(["success", "failure", "timeout"]),
	summary: z.string(),
	evidence: z.string().optional(),
	exitCode: z.number().optional(),
	error: z.string().optional(),
});
export type AgentResult = z.infer<typeof AgentResultSchema>;

export const FileSystemEntrySchema = z.object({
	path: z.string(),
	isDirectory: z.boolean(),
});
export type FileSystemEntry = z.infer<typeof FileSystemEntrySchema>;

export const GitCommitInfoSchema = z.object({
	sha: z.string(),
	message: z.string(),
});
export type GitCommitInfo = z.infer<typeof GitCommitInfoSchema>;
