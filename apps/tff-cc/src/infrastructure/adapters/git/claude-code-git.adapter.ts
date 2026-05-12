import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Ok, Err, ContractError } from "@tff/core";
import type { GitOperations, GitCommitInfo, FileSystemEntry } from "@tff/core";

const exec = promisify(execFile);

const cleanGitEnv = (): Record<string, string> => {
	const env: Record<string, string> = {};
	for (const [k, v] of Object.entries(process.env)) {
		if (!k.startsWith("GIT_") && v !== undefined) env[k] = v;
	}
	return env;
};

const runGit = async (args: string[], cwd: string): Promise<string> => {
	const { stdout } = await exec("git", args, { cwd, timeout: 30_000, env: cleanGitEnv() });
	return stdout.trim();
};

export class ClaudeCodeGitAdapter implements GitOperations {
	constructor(private readonly repoRoot: string) {}

	async createBranch(name: string, base?: string) {
		try {
			const args = ["branch", name];
			if (base) args.push(base);
			await runGit(args, this.repoRoot);
			return Ok(undefined);
		} catch (err) {
			return Err(
				new ContractError(`git branch failed`, "GitOperations", "createBranch", String(err)),
			);
		}
	}

	async createWorktree(path: string, branch: string) {
		try {
			await runGit(["worktree", "add", path, "-b", branch], this.repoRoot);
			return Ok(undefined);
		} catch (err) {
			return Err(
				new ContractError(
					`git worktree add failed`,
					"GitOperations",
					"createWorktree",
					String(err),
				),
			);
		}
	}

	async deleteWorktree(path: string) {
		try {
			await runGit(["worktree", "remove", path, "--force"], this.repoRoot);
			return Ok(undefined);
		} catch (err) {
			return Err(
				new ContractError(
					`git worktree remove failed`,
					"GitOperations",
					"deleteWorktree",
					String(err),
				),
			);
		}
	}

	async commit(message: string, files?: string[]) {
		try {
			if (files && files.length > 0) {
				await runGit(["add", ...files], this.repoRoot);
			}
			await runGit(["commit", "-m", message], this.repoRoot);
			const sha = await runGit(["rev-parse", "--short", "HEAD"], this.repoRoot);
			const info: GitCommitInfo = { sha, message };
			return Ok(info);
		} catch (err) {
			return Err(new ContractError(`git commit failed`, "GitOperations", "commit", String(err)));
		}
	}

	async getCurrentBranch() {
		try {
			const branch = await runGit(["rev-parse", "--abbrev-ref", "HEAD"], this.repoRoot);
			if (branch === "HEAD") {
				return Err(new ContractError("Detached HEAD", "GitOperations", "getCurrentBranch"));
			}
			return Ok(branch);
		} catch (err) {
			return Err(
				new ContractError(
					`git branch detection failed`,
					"GitOperations",
					"getCurrentBranch",
					String(err),
				),
			);
		}
	}

	async branchExists(name: string) {
		try {
			await runGit(["rev-parse", "--verify", `refs/heads/${name}`], this.repoRoot);
			return Ok(true);
		} catch {
			return Ok(false);
		}
	}

	async pushBranch(name: string, remote = "origin") {
		try {
			await runGit(["push", remote, `${name}:${name}`], this.repoRoot);
			return Ok(undefined);
		} catch (err) {
			return Err(new ContractError(`git push failed`, "GitOperations", "pushBranch", String(err)));
		}
	}

	async detectDefaultBranch() {
		try {
			const origin = await runGit(["symbolic-ref", "refs/remotes/origin/HEAD"], this.repoRoot);
			const ref = origin.replace("refs/remotes/origin/", "");
			if (ref) return Ok(ref);
		} catch {
			/* fall through */
		}
		try {
			const config = await runGit(["config", "init.defaultBranch"], this.repoRoot);
			if (config) return Ok(config);
		} catch {
			/* fall through */
		}
		return Ok("main");
	}

	async lsTree(branch: string, path?: string) {
		try {
			const args = ["ls-tree", "-r", "--name-only", branch];
			if (path) args.push(path);
			const output = await runGit(args, this.repoRoot);
			const lines = output.split("\n").filter(Boolean);
			const entries: FileSystemEntry[] = lines.map((line) => ({
				path: line,
				isDirectory: false,
			}));
			return Ok(entries);
		} catch (err) {
			return Err(new ContractError(`git ls-tree failed`, "GitOperations", "lsTree", String(err)));
		}
	}

	async extractFile(branch: string, path: string) {
		try {
			const content = await runGit(["show", `${branch}:${path}`], this.repoRoot);
			return Ok(content);
		} catch (err) {
			return Err(new ContractError(`git show failed`, "GitOperations", "extractFile", String(err)));
		}
	}
}
