import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { TffContext } from "../common/context.js";

export async function runHelp(
	pi: ExtensionAPI,
	_ctx: TffContext,
	_uiCtx: ExtensionCommandContext | null,
	_args: string[],
): Promise<void> {
	pi.sendUserMessage(
		"Here are the available TFF commands:\n\n" +
			"**Project lifecycle:**\n" +
			"- `/tff init` — Initialize TFF in the current Git repository\n" +
			"- `/tff new [name]` — Start a new project (AI-assisted brainstorm)\n" +
			"- `/tff new-milestone [name]` — Create a new milestone\n\n" +
			"**Slice workflow:**\n" +
			"- `/tff discuss [sliceId]` — Run the discuss phase on a slice\n" +
			"- `/tff research [sliceId]` — Run the research phase on a slice\n" +
			"- `/tff plan [sliceId]` — Run the plan phase on a slice\n" +
			"- `/tff execute [sliceId]` — Run the execute phase (wave-based task dispatch)\n" +
			"- `/tff verify [sliceId]` — Run verification (AC check + tests)\n" +
			"- `/tff review [sliceId]` — Run code + security review on the slice diff\n" +
			"- `/tff ship [sliceId]` — Open the slice PR and run CI\n" +
			"- `/tff ship-merged [sliceId]` — You merged the PR: cleanup worktree + close slice\n" +
			"- `/tff ship-changes [sliceId] <feedback>` — Reviewer requested changes: reopen for fixes\n" +
			"- `/tff ship-fix [sliceId]` — Apply an inline fix from REVIEW_FEEDBACK.md\n\n" +
			"Phases end with a printed `→ Next: /tff <phase> M##-S##` hint. Type what it shows to advance.\n\n" +
			"**Milestone completion:**\n" +
			"- `/tff complete-milestone [M01]` — Create milestone PR after all slices ship\n" +
			"- `/tff complete-milestone-merged [M01]` — Milestone PR merged: cleanup + close\n" +
			"- `/tff complete-milestone-changes [M01] <feedback>` — Milestone PR needs changes\n\n" +
			"**Operational:**\n" +
			"- `/tff status` — Show current project status\n" +
			"- `/tff progress` — Show detailed progress table\n" +
			"- `/tff logs [M01-S01] [--json]` — Show event timeline for a slice\n" +
			"- `/tff health` — Quick database health check\n" +
			"- `/tff doctor` — Full project diagnosis (DB, Git, worktrees, agents)\n" +
			"- `/tff recover` — Crash recovery: scan for stuck slices and offer fixes\n" +
			"- `/tff settings` — Show current settings\n" +
			"- `/tff settings set <key> <value>` — Change a setting\n" +
			"- `/tff state rename <newCodeBranch>` — Rename the TFF state branch\n" +
			"- `/tff branch rename <newCodeBranch>` — Rename the current Git branch\n" +
			"- `/tff next` — Show next phase hint (deprecated; hints print automatically)\n" +
			"- `/tff help` — Show this help",
	);
}
