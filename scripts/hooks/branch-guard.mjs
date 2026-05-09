#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const MILESTONE_BRANCH = /^milestone\/[0-9a-f]{8}$/;

let gitDir;
try {
	gitDir = execSync("git rev-parse --git-dir", {
		stdio: ["ignore", "pipe", "ignore"],
	})
		.toString()
		.trim();
} catch {
	process.exit(0); // not a git repo — allow
}

// Skip during rebase / merge: hook fires on replayed commits but
// user's intent is the rebase/merge itself.
if (
	existsSync(join(gitDir, "rebase-merge")) ||
	existsSync(join(gitDir, "rebase-apply")) ||
	existsSync(join(gitDir, "MERGE_HEAD"))
) {
	process.exit(0);
}

let branch;
try {
	branch = execSync("git symbolic-ref --short HEAD", {
		stdio: ["ignore", "pipe", "ignore"],
	})
		.toString()
		.trim();
} catch {
	process.exit(0); // detached HEAD — allow
}

if (!MILESTONE_BRANCH.test(branch)) {
	process.exit(0);
}

if ("1" === process.env.TFF_ALLOW_MILESTONE_COMMIT) {
	process.stderr.write(`⚠ branch-guard: bypassed via TFF_ALLOW_MILESTONE_COMMIT=1 on ${branch}\n`);
	process.exit(0);
}

process.stderr.write(
	`✗ branch-guard: refusing commit on milestone branch ${branch}.\n` +
		`  Switch to the slice worktree at .tff-cc/worktrees/<slice-id>/, or set\n` +
		`  TFF_ALLOW_MILESTONE_COMMIT=1 for a one-off override.\n`,
);
process.exit(1);
