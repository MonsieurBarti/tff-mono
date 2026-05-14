import { beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { skillsApproveCmd } from "../../../../src/cli/commands/skills-approve.cmd.js";

const { getFsState, setFsState } = vi.hoisted(() => {
	const _state: Record<string, string> = {};
	return {
		getFsState: () => _state,
		setFsState: (v: Record<string, string>) => {
			for (const key of Object.keys(_state)) delete _state[key];
			for (const [k, v2] of Object.entries(v)) _state[k] = v2;
		},
	};
});

const { getGitDirty, setGitDirty } = vi.hoisted(() => {
	let _dirty = false;
	return {
		getGitDirty: () => _dirty,
		setGitDirty: (v: boolean) => {
			_dirty = v;
		},
	};
});

const { getGitShowError, setGitShowError } = vi.hoisted(() => {
	let _err = false;
	return {
		getGitShowError: () => _err,
		setGitShowError: (v: boolean) => {
			_err = v;
		},
	};
});

vi.mock("node:fs", () => {
	const mocked = {
		existsSync: vi.fn((p: string) => {
			for (const key of Object.keys(getFsState())) {
				if (p === key || p.endsWith(key)) return true;
			}
			if (p.includes("test-skill")) return true;
			return false;
		}),
		readFileSync: vi.fn((p: string, ..._args: any[]) => {
			for (const [key, value] of Object.entries(getFsState())) {
				if (p === key || p.endsWith(key)) return value;
			}
			return "";
		}),
		writeFileSync: vi.fn((p: string, content: string, ..._args: any[]) => {
			getFsState()[p] = content;
		}),
		mkdirSync: vi.fn((_p: string, _opts?: any) => {
			// no-op for tests
		}),
		appendFileSync: vi.fn((p: string, content: string, ..._args: any[]) => {
			getFsState()[p] = (getFsState()[p] ?? "") + content;
		}),
	};
	return { default: mocked, ...mocked };
});

vi.mock("node:child_process", () => ({
	spawnSync: vi.fn((cmd: string, args: string[], _opts: any) => {
		if (cmd !== "git") {
			return { status: 1, stderr: "not git" };
		}
		if (args[0] === "status" && args[1] === "--porcelain") {
			return {
				status: 0,
				stdout: getGitDirty() ? "M  skills/test-skill/SKILL.md\n" : "",
				stderr: "",
			};
		}
		if (args[0] === "show") {
			if (getGitShowError()) {
				return { status: 1, stderr: "fatal: not a git repo" };
			}
			const relPath = args[1]?.replace("HEAD:", "") ?? "";
			let content = "skill content";
			for (const [key, value] of Object.entries(getFsState())) {
				if (key.endsWith(relPath)) {
					content = value;
					break;
				}
			}
			return {
				status: 0,
				stdout: content,
				stderr: "",
			};
		}
		return { status: 1, stderr: "unknown git command" };
	}),
}));

function seedFs(): void {
	setFsState({
		[path.resolve(process.cwd(), "skills/test-skill/SKILL.md")]: "# Test Skill\n",
	});
	setGitDirty(false);
	setGitShowError(false);
}

describe("skills:approve", () => {
	beforeEach(() => {
		seedFs();
	});

	it("approves a new skill with seed-original-commit-sha", async () => {
		const raw = await skillsApproveCmd([
			"--id",
			"test-skill",
			"--reason",
			"Initial approval",
			"--approved-diff-sha",
			"960aca2eea2ca63f18feaf6b2220c659ec8e7eb1110f2ceee9cbe37b3fec8eca",
			"--seed-original-commit-sha",
			"deadbeef",
		]);
		const result = JSON.parse(raw);
		if (!result.ok) throw new Error(`approve failed: ${JSON.stringify(result)}`);
		expect(result.ok).toBe(true);
		expect(result.data.noop).toBe(false);
		expect(result.data.skillId).toBe("test-skill");
	});

	it("returns noop when sha unchanged", async () => {
		await skillsApproveCmd([
			"--id",
			"test-skill",
			"--reason",
			"Initial approval",
			"--approved-diff-sha",
			"960aca2eea2ca63f18feaf6b2220c659ec8e7eb1110f2ceee9cbe37b3fec8eca",
			"--seed-original-commit-sha",
			"deadbeef",
		]);
		const result = JSON.parse(
			await skillsApproveCmd([
				"--id",
				"test-skill",
				"--reason",
				"Re-approval",
				"--approved-diff-sha",
				"960aca2eea2ca63f18feaf6b2220c659ec8e7eb1110f2ceee9cbe37b3fec8eca",
			]),
		);
		expect(result.ok).toBe(true);
		expect(result.data.noop).toBe(true);
	});

	it("fails when skill has uncommitted changes", async () => {
		setGitDirty(true);
		const result = JSON.parse(
			await skillsApproveCmd([
				"--id",
				"test-skill",
				"--reason",
				"Approval",
				"--approved-diff-sha",
				"960aca2eea2ca63f18feaf6b2220c659ec8e7eb1110f2ceee9cbe37b3fec8eca",
				"--seed-original-commit-sha",
				"deadbeef",
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("APPROVE_FAILED");
	});

	it("fails when approved-diff-sha does not match", async () => {
		const result = JSON.parse(
			await skillsApproveCmd([
				"--id",
				"test-skill",
				"--reason",
				"Approval",
				"--approved-diff-sha",
				"00000000",
				"--seed-original-commit-sha",
				"deadbeef",
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("APPROVE_FAILED");
	});

	it("fails for invalid skill id", async () => {
		const result = JSON.parse(
			await skillsApproveCmd([
				"--id",
				"INVALID_ID!",
				"--reason",
				"Approval",
				"--approved-diff-sha",
				"960aca2eea2ca63f18feaf6b2220c659ec8e7eb1110f2ceee9cbe37b3fec8eca",
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("APPROVE_FAILED");
	});

	it("fails when skill not found", async () => {
		const result = JSON.parse(
			await skillsApproveCmd([
				"--id",
				"missing-skill",
				"--reason",
				"Approval",
				"--approved-diff-sha",
				"960aca2eea2ca63f18feaf6b2220c659ec8e7eb1110f2ceee9cbe37b3fec8eca",
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("APPROVE_FAILED");
	});

	it("fails when missing required flags", async () => {
		const result = JSON.parse(await skillsApproveCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
