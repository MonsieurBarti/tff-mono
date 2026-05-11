import { Observation, OBSERVATIONS_DIR, isOk } from "@tff/core";
import { JsonlStoreAdapter } from "../../infrastructure/adapters/jsonl/jsonl-store.adapter.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";

export const observeRecordSchema: CommandSchema = {
	name: "observe:record",
	purpose: "Record an observation for pattern detection",
	mutates: true,
	requiredFlags: [
		{
			name: "ts",
			type: "string",
			description: "Timestamp",
		},
		{
			name: "session",
			type: "string",
			description: "Session ID",
		},
		{
			name: "tool",
			type: "string",
			description: "Tool name",
		},
		{
			name: "args",
			type: "json",
			description: "Tool arguments as JSON",
		},
		{
			name: "project",
			type: "string",
			description: "Project ID",
		},
	],
	optionalFlags: [],
	examples: [
		'observe:record --ts "2024-01-01T00:00:00Z" --session sess-1 --tool Read --args \'{"path":"file.ts"}\' --project proj-1',
	],
};

export const observeRecordCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, observeRecordSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	try {
		const rawArgs = parsed.data.args;
		const args =
			rawArgs === null ? null : typeof rawArgs === "string" ? rawArgs : JSON.stringify(rawArgs);
		const obs = Observation.create({
			ts: parsed.data.ts as string,
			session: parsed.data.session as string,
			tool: parsed.data.tool as string,
			args,
			project: parsed.data.project as string,
		});
		const store = new JsonlStoreAdapter(OBSERVATIONS_DIR);
		const result = await store.appendObservation(obs);
		if (isOk(result)) return JSON.stringify({ ok: true, data: null });
		return JSON.stringify({ ok: false, error: result.error });
	} catch (e) {
		return JSON.stringify({ ok: false, error: { code: "INVALID_ARGS", message: String(e) } });
	}
};
