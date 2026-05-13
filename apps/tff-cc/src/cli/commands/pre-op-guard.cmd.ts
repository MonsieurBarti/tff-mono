import { existsSync } from "node:fs";
import path from "node:path";
import { TFF_DIR, isOk } from "@tff/core";
import {
	OperationBlockedError,
	validateOperation,
} from "../../application/guard/validate-operation.js";
import { isValidOperation } from "../../application/index.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { createAdapters } from "../../infrastructure/adapters/index.js";
import { resolveRepoRoot } from "../../infrastructure/home-directory.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { withSyncLock } from "../with-sync-lock.js";

/**
 * Check if pre-operation guards are disabled in settings.yaml.
 * Returns true if workflow.guards is explicitly false.
 */
async function areGuardsDisabled(repoRoot: string): Promise<boolean> {
	const { configReader } = createAdapters(repoRoot);
	const result = await configReader.readConfig("workflow.guards");
	return isOk(result) && result.data === false;
}

/**
 * Check if the project is initialized (has .tff directory).
 */
function isProjectInitialized(repoRoot: string): boolean {
	const tffDir = path.join(repoRoot, TFF_DIR);
	return existsSync(tffDir);
}

export const preOpGuardSchema: CommandSchema = {
	name: "pre-op:guard",
	purpose: "Validate an operation is allowed for a slice",
	mutates: false,
	requiredFlags: [
		{
			name: "slice-id",
			type: "string",
			description: "Slice ID",
			pattern: "^M\\d+-S\\d+$",
		},
		{
			name: "operation",
			type: "string",
			description: "Operation to validate",
			enum: ["discuss", "research", "plan", "execute", "verify", "ship", "complete"],
		},
	],
	optionalFlags: [],
	examples: ["pre-op:guard --slice-id M01-S01 --operation execute"],
};

export const preOpGuardCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, preOpGuardSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "slice-id": sliceId, operation } = parsed.data as {
		"slice-id": string;
		operation: string;
	};

	const repoRoot = resolveRepoRoot(process.cwd());

	// Fast path: check if guards are disabled
	if (await areGuardsDisabled(repoRoot)) {
		return JSON.stringify({
			ok: true,
			data: { blocked: false },
		});
	}

	// Check if project is initialized
	if (!isProjectInitialized(repoRoot)) {
		return JSON.stringify({
			ok: true,
			data: { blocked: false },
		});
	}

	// Validate operation name early for clear error
	if (!isValidOperation(operation)) {
		return JSON.stringify({
			ok: false,
			error: {
				code: "INVALID_OPERATION",
				message: `Unknown operation: ${operation}`,
				recoveryHint: `Supported operations: discuss, research, plan, execute, verify, ship, complete`,
			},
		});
	}

	// Compose withSyncLock (outer) for concurrency control
	const result = await withSyncLock(async () => {
		try {
			const { sliceStore } = createClosableStateStoresUnchecked();

			// Retrieve the slice
			const sliceResult = sliceStore.getSlice(sliceId);
			if (!isOk(sliceResult)) {
				return JSON.stringify({
					ok: false,
					error: {
						code: "SLICE_NOT_FOUND",
						message: `Failed to retrieve slice: ${sliceResult.error.message}`,
						recoveryHint: `Check that slice ${sliceId} exists.`,
					},
				});
			}

			const slice = sliceResult.data;
			if (!slice) {
				return JSON.stringify({
					ok: false,
					error: {
						code: "SLICE_NOT_FOUND",
						message: `Slice ${sliceId} not found`,
						recoveryHint: `Check that slice ${sliceId} exists.`,
					},
				});
			}

			// Validate operation against current slice status
			const validationResult = validateOperation(operation, slice.status);

			if (!validationResult.allowed) {
				return JSON.stringify({
					ok: false,
					error: {
						code: "PREREQUISITE_NOT_MET",
						message: validationResult.message,
						recoveryHint: validationResult.recoveryHint,
					},
				});
			}

			// Operation is allowed
			return JSON.stringify({
				ok: true,
				data: { blocked: false },
			});
		} catch (err) {
			if (err instanceof OperationBlockedError) {
				return JSON.stringify({
					ok: false,
					error: {
						code: "PREREQUISITE_NOT_MET",
						message: err.message,
						recoveryHint: err.recoveryHint,
					},
				});
			}
			return JSON.stringify({
				ok: false,
				error: {
					code: "GUARD_CHECK_FAILED",
					message: err instanceof Error ? err.message : String(err),
				},
			});
		}
	});

	// withSyncLock can return SyncLockResult (when lock is held)
	if (result && typeof result === "object" && "ok" in result && result.ok === true) {
		if ("data" in result && result.data && typeof result.data === "object") {
			if ("action" in result.data && result.data.action === "skipped") {
				return JSON.stringify({
					ok: false,
					error: {
						code: "LOCK_UNAVAILABLE",
						message: "Sync lock held by another process",
						recoveryHint: "Wait for other operations to complete and retry.",
					},
				});
			}
		}
	}

	return result as string;
};
