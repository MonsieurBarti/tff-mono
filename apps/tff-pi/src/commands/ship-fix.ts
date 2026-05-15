import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { sliceLabel } from "@tff/core";
import { type TffContext, requireProject } from "../common/context.js";
import { resolveSlice } from "../common/db-resolvers.js";
import { getMilestone } from "../common/db.js";
import type { PhaseContext } from "../common/phase.js";
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
	const { db: database, root, settings } = project;
	const label = args[0] ?? "";
	const slice = label ? resolveSlice(database, label) : findActiveSlice(database);
	if (!slice) {
		const msg = label ? `Slice not found: ${label}` : "No active slice found.";
		if (uiCtx?.hasUI) uiCtx.ui.notify(msg, "error");
		else pi.sendUserMessage(msg);
		return;
	}

	if (slice.status === "closed") {
		const msg = `Slice ${slice.number} is already closed — cannot apply ship-fix.`;
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

	// Record ship-fix event into DB (validates slice+milestone internally).
	const logResult = handleShipFix(pi, database, root, slice.id);
	if (logResult.isError) {
		const msg = logResult.content[0]?.text ?? "Ship-fix failed.";
		if (uiCtx?.hasUI) uiCtx.ui.notify(msg, "error");
		else pi.sendUserMessage(msg);
		return;
	}

	const sLabel = sliceLabel(milestone.number, slice.number);
	if (uiCtx?.hasUI) {
		uiCtx.ui.notify(`Starting ship-fix phase for ${sLabel}...`, "info");
	}

	const phaseCtx: PhaseContext = {
		pi,
		db: database,
		root,
		slice,
		milestoneNumber: milestone.number,
		settings,
		fffBridge: ctx.fffBridge,
	};

	await runHeavyPhase(ctx, "ship-fix", shipFixPhase, phaseCtx);
}
