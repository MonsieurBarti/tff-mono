import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { readArtifact, milestoneLabel, sliceLabel } from "@tff/core";
import { type TffContext, requireProject } from "../common/context.js";
import { resolveSlice } from "../common/db-resolvers.js";
import { getMilestone } from "../common/db.js";
import type { PhaseContext } from "../common/phase.js";
import { DEFAULT_SETTINGS } from "../common/settings.js";
import { findActiveSlice } from "../orchestrator.js";
import { shipFixPhase } from "../phases/ship-fix.js";
import { handleShipFix } from "../tools/ship-fix.js";
import { runHeavyPhase } from "./run-heavy-phase.js";

export async function runShipFix(
	pi: ExtensionAPI,
	ctx: TffContext,
	uiCtx: ExtensionCommandContext | null,
	args: string[],
): Promise<void> {
	const project = requireProject(ctx, uiCtx);
	if (!project) return;
	const { db: database, root } = project;
	const label = args[0] ?? "";
	const slice = label ? resolveSlice(database, label) : findActiveSlice(database);
	if (!slice) {
		const msg = label ? `Slice not found: ${label}` : "No active slice found.";
		if (uiCtx?.hasUI) uiCtx.ui.notify(msg, "error");
		else pi.sendUserMessage(msg);
		return;
	}

	const milestone = getMilestone(database, slice.milestoneId);
	if (!milestone) {
		const msg = "Milestone not found for slice.";
		if (uiCtx?.hasUI) uiCtx.ui.notify(msg, "error");
		else pi.sendUserMessage(msg);
		return;
	}

	const mLabel = milestoneLabel(milestone.number);
	const sLabel = sliceLabel(milestone.number, slice.number);

	// Validate REVIEW_FEEDBACK.md exists
	const feedbackRel = `milestones/${mLabel}/slices/${sLabel}/REVIEW_FEEDBACK.md`;
	const feedback = readArtifact(root, feedbackRel) ?? "";
	if (!feedback.trim()) {
		const msg = `No REVIEW_FEEDBACK.md found for ${sLabel}. Run \`/tff ship-changes\` first to fetch reviewer comments.`;
		if (uiCtx?.hasUI) uiCtx.ui.notify(msg, "error");
		else pi.sendUserMessage(msg);
		return;
	}

	// Record ship-fix event into DB
	const logResult = handleShipFix(pi, database, root, slice.id);
	if (logResult.isError) {
		const msg = logResult.content[0]?.text ?? "Ship-fix failed.";
		if (uiCtx?.hasUI) uiCtx.ui.notify(msg, "error");
		else pi.sendUserMessage(msg);
		return;
	}

	if (uiCtx?.hasUI) {
		uiCtx.ui.notify(`Starting ship-fix phase for ${sLabel}...`, "info");
	}

	const phaseCtx: PhaseContext = {
		pi,
		db: database,
		root,
		slice,
		milestoneNumber: milestone.number,
		settings: ctx.settings ?? DEFAULT_SETTINGS,
		fffBridge: ctx.fffBridge,
	};

	await runHeavyPhase(ctx, "ship-fix", shipFixPhase, phaseCtx);
}
