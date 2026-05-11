import type { GitOps } from "../../domain/ports/git-ops.port.js";
import {
	Err,
	Ok,
	createDomainError,
	type DomainError,
	type MilestoneStore,
	type Result,
	type SliceStore,
} from "@tff/core";

const MILESTONE_BRANCH_RE = /^milestone\/([0-9a-f]{8})$/;

export const assertNotOnMilestoneBranch = async (
	git: GitOps,
	command: string,
	sliceStore: SliceStore,
	milestoneStore: MilestoneStore,
): Promise<Result<void, DomainError>> => {
	const currentR = await git.getCurrentBranch();
	if (!currentR.ok) return currentR;

	const branch = currentR.data;
	const m = MILESTONE_BRANCH_RE.exec(branch);
	if (!m) return Ok(undefined);
	const prefix = m[1];

	const milestonesR = milestoneStore.listMilestones();
	if (!milestonesR.ok) return milestonesR;
	const milestone = milestonesR.data.find((x) => x.id.startsWith(prefix));
	if (!milestone) return Ok(undefined);

	const slicesR = sliceStore.listSlices(milestone.id);
	if (!slicesR.ok) return slicesR;
	const openCount = slicesR.data.filter((s) => s.status !== "closed").length;
	if (openCount === 0) return Ok(undefined);

	return Err(
		createDomainError(
			"REFUSED_ON_MILESTONE_BRANCH",
			`Refusing to run "${command}" on milestone branch "${branch}" while ${openCount} slice(s) are still open. Switch to the slice worktree at .tff/worktrees/<slice-id>/ before mutating state.`,
			{ command, branch, openSlices: openCount },
		),
	);
};
