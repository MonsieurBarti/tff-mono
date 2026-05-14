import { z } from "zod";

export const AutonomySettingsSchema = z.object({ mode: z.enum(["guided", "plan-to-pr"]) });
export type AutonomySettings = z.infer<typeof AutonomySettingsSchema>;
