import { z } from "zod";
import { AgentCapabilitySchema } from "./agent-capability.js";

export const WorkflowPoolSchema = z.object({
	workflow_id: z.string().min(1),
	agents: z.array(AgentCapabilitySchema).min(1),
	default_agent: z.string().min(1),
});
export type WorkflowPool = z.infer<typeof WorkflowPoolSchema>;
