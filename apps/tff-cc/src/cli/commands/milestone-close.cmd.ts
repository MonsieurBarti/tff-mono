import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { archiveMilestoneFs } from "../../application/archive/archive-fs.js";
import { resolveMilestoneId } from "../../application/milestone/resolve-milestone-id.js";
import { buildMilestoneScorecard } from "../../application/routing/build-milestone-scorecard.js";
import {
	type BaseDomainError,
	isOk,
	milestoneDir,
	milestoneLabel,
	PreconditionViolationError,
	sliceLabelFor,
} from "@tff/core";
import { YamlRoutingConfigReader } from "../../infrastructure/adapters/filesystem/yaml-routing-config-reader.js";
import { JsonlRoutingOutcomeReader } from "../../infrastructure/adapters/jsonl/routing-outcome-jsonl-reader.js";
import { tffWarn } from "../../infrastructure/adapters/logging/warn.js";
import { createClosableStateStoresUnchecked } from "../../infrastructure/adapters/sqlite/create-state-stores.js";
import { withTransaction } from "../../infrastructure/persistence/with-transaction.js";
import { resolvePluginRoot } from "../../infrastructure/plugin-root.js";
import { type CommandSchema, parseFlags } from "../utils/flag-parser.js";
import { resolveRoutingPaths } from "../utils/routing-paths.js";

export const milestoneCloseSchema: CommandSchema = {
	name: "milestone:close",
	purpose: "Close a milestone",
	mutates: true,
	requiredFlags: [
		{
			name: "milestone-id",
			type: "string",
			description: "Milestone UUID or M-label (e.g., M01) to close",
		},
	],
	optionalFlags: [
		{
			name: "reason",
			type: "string",
			description: "Reason for closing",
		},
	],
	examples: [
		"milestone:close --milestone-id M01",
		"milestone:close --milestone-id <uuid>",
		'milestone:close --milestone-id M01 --reason "Completed"',
	],
};

export const milestoneCloseCmd = async (args: string[]): Promise<string> => {
	const parsed = parseFlags(args, milestoneCloseSchema);
	if (!parsed.ok) {
		return JSON.stringify(parsed);
	}

	const { "milestone-id": rawMilestoneId, reason } = parsed.data as {
		"milestone-id": string;
		reason?: string;
	};

	const projectRoot = process.cwd();
	const closableStores = createClosableStateStoresUnchecked();
	const { db, milestoneStore, pendingJudgmentStore, sliceStore } = closableStores;

	try {
		const resolved = resolveMilestoneId(milestoneStore, rawMilestoneId);
		if (!isOk(resolved)) {
			return JSON.stringify({ ok: false, error: resolved.error });
		}

		// Precondition: milestone must not already be closed.
		const milestoneResult = milestoneStore.getMilestone(resolved.data);
		if (!isOk(milestoneResult)) {
			return JSON.stringify({
				ok: false,
				error: new PreconditionViolationError("Failed to look up milestone", ["milestone_lookup"]),
			});
		}
		if (!milestoneResult.data) {
			return JSON.stringify({
				ok: false,
				error: new PreconditionViolationError("Milestone not found", ["milestone_exists"]),
			});
		}
		if ((milestoneResult.data as { status: string }).status === "closed") {
			return JSON.stringify({
				ok: false,
				error: new PreconditionViolationError("Milestone is already closed", ["milestone_active"]),
			});
		}

		// Precondition: every closed slice in this milestone must have a recorded
		// routing judgment (pending_judgments empty for the milestone). Routing
		// decisions are graded post-merge per slice, and an unjudged slice means
		// the merge-to-main aggregate would be incomplete. Drain via /tff:judge
		// or judge:pending:clear before closing.
		const pendingRes = pendingJudgmentStore.listPendingForMilestone(resolved.data as string);
		if (!pendingRes.ok) return JSON.stringify({ ok: false, error: pendingRes.error });
		if (pendingRes.data.length > 0) {
			const labels = pendingRes.data.map((p) => {
				const s = sliceStore.getSlice(p.sliceId);
				if (!s.ok || !s.data) return p.sliceId;
				const sliceData = s.data as {
					kind: "milestone" | "quick" | "debug";
					number: number;
					milestoneId: string | null;
				};
				const milestone = sliceData.milestoneId
					? milestoneStore.getMilestone(sliceData.milestoneId)
					: null;
				const milestoneData = milestone?.ok
					? ((milestone.data as { number: number } | null) ?? undefined)
					: undefined;
				try {
					return sliceLabelFor(sliceData, milestoneData ?? undefined);
				} catch {
					return p.sliceId;
				}
			});
			return JSON.stringify({
				ok: false,
				error: {
					code: "PENDING_JUDGMENTS",
					message: `Milestone has ${pendingRes.data.length} slice(s) with pending routing judgments: ${labels.join(", ")}. Drain via /tff:judge before closing.`,
					context: { slices: labels },
				},
			});
		}

		let businessError: BaseDomainError<unknown> | null = null;
		const txResult = await withTransaction(db, () => {
			const r = milestoneStore.closeMilestone(resolved.data, reason);
			if (!r.ok) businessError = r.error;
			return { data: null, tmpRenames: [] };
		});
		if (!txResult.ok) return JSON.stringify({ ok: false, error: txResult.error });
		if (businessError) return JSON.stringify({ ok: false, error: businessError });

		// Write a milestone-level routing scorecard aggregating per-slice
		// model-judge verdicts. Best-effort: a write failure does not undo
		// the close.
		let scorecardWritten: string | null = null;
		try {
			const milestone = milestoneStore.getMilestone(resolved.data);
			if (milestone.ok && milestone.data) {
				const msLabel = milestoneLabel((milestone.data as { number: number }).number);
				const slices = sliceStore.listSlices(resolved.data);
				const sliceLabels = slices.ok
					? (slices.data as Array<{ number: number }>).map(
							(s) => `${msLabel}-S${String(s.number).padStart(2, "0")}`,
						)
					: [];

				const configReader = new YamlRoutingConfigReader({
					projectRoot,
					pluginRoot: resolvePluginRoot(),
				});
				const configRes = await configReader.readConfig();
				if (configRes.ok && configRes.data.enabled) {
					const { outcomesPath } = resolveRoutingPaths(projectRoot, configRes.data.logging.path);
					const outcomeSource = new JsonlRoutingOutcomeReader(outcomesPath);
					const scorecard = await buildMilestoneScorecard({
						milestoneId: resolved.data as string,
						milestoneLabel: msLabel,
						sliceLabels,
						outcomeSource,
						now: () => new Date().toISOString(),
					});
					const targetDir = join(projectRoot, milestoneDir(msLabel));
					mkdirSync(targetDir, { recursive: true });
					const targetPath = join(targetDir, "routing-scorecard.json");
					writeFileSync(targetPath, `${JSON.stringify(scorecard, null, 2)}\n`, "utf8");
					scorecardWritten = targetPath;
				}
			}
		} catch {
			// Best-effort: do not block close on scorecard write.
		}

		// After successful close + scorecard: archive.
		// 1. DB: cascade-mark milestone + all slices archived (idempotent).
		const archiveDbResult = milestoneStore.archiveMilestoneCascade(resolved.data);
		// 2. FS: rename milestone dir to archive bucket. DB is source of truth;
		//    FS failure is logged but does NOT roll back the close.
		let fsArchiveError: string | null = null;
		let dbArchived = archiveDbResult.ok;
		let archivedSrcRel: string | null = null;
		let archivedDstRel: string | null = null;
		if (archiveDbResult.ok) {
			const milestoneRow = milestoneStore.getMilestone(resolved.data);
			if (milestoneRow.ok && milestoneRow.data) {
				const msLabel = milestoneLabel((milestoneRow.data as { number: number }).number);
				archivedSrcRel = milestoneDir(msLabel);
				archivedDstRel = `.tff/archive/milestones/${msLabel}`;
				const fsResult = archiveMilestoneFs(milestoneRow.data, projectRoot);
				if (!fsResult.ok) {
					fsArchiveError = fsResult.reason;
					tffWarn(
						`milestone ${resolved.data} archived in DB but FS rename failed: ${fsResult.reason}`,
					);
				}
			}
		} else {
			fsArchiveError = archiveDbResult.error.message;
			dbArchived = false;
			tffWarn(`milestone ${resolved.data} DB archive failed: ${archiveDbResult.error.message}`);
		}

		// If the scorecard was written into a dir that the archive then moved,
		// re-target the returned path so callers can still read the file.
		if (
			scorecardWritten &&
			!fsArchiveError &&
			archivedSrcRel &&
			archivedDstRel &&
			scorecardWritten.startsWith(join(projectRoot, archivedSrcRel))
		) {
			scorecardWritten =
				join(projectRoot, archivedDstRel) +
				scorecardWritten.slice(join(projectRoot, archivedSrcRel).length);
		}

		return JSON.stringify({
			ok: true,
			data: {
				status: "closed",
				reason,
				scorecard_path: scorecardWritten,
				archived: {
					db: dbArchived,
					fs: dbArchived && !fsArchiveError,
					fs_error: fsArchiveError ?? undefined,
				},
			},
		});
	} finally {
		closableStores.close();
	}
};
