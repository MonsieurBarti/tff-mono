import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

const PLUGINS_DATA_DIR = ".claude/plugins/data";
const PLANNOTATOR_PLUGIN_ID = "plannotator-plannotator";

export const plannotatorCheckSchema: CommandSchema = {
	name: "plannotator:check",
	purpose: "Detect whether the plannotator plugin is installed.",
	mutates: false,
	requiredFlags: [],
	optionalFlags: [],
	examples: ["plannotator:check"],
};

export interface PlannotatorCheckResult {
	readonly available: boolean;
	readonly path?: string;
	readonly hint?: string;
}

export const plannotatorCheckCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, plannotatorCheckSchema);
	if (!parsed.ok) return JSON.stringify(parsed);

	const pluginPath = join(homedir(), PLUGINS_DATA_DIR, PLANNOTATOR_PLUGIN_ID);
	const available = existsSync(pluginPath);

	const result: PlannotatorCheckResult = available
		? { available: true, path: pluginPath }
		: {
				available: false,
				hint: "Plannotator not installed. See README § Setup Guide for install instructions.",
			};

	return JSON.stringify({ ok: true, data: result });
};
