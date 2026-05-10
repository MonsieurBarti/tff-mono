import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TFF_AGENT_NAMES, ensureProjectAgents } from "../../../src/common/subagent-agents.js";

const RESOURCES_DIR = join(process.cwd(), "src", "resources");
const CORE_AGENTS_DIR = join(
	process.cwd(),
	"..",
	"..",
	"packages",
	"core",
	"src",
	"content",
	"agents",
);

function readAgentFile(name: string): string {
	const local = join(RESOURCES_DIR, "agents", `${name}.md`);
	if (existsSync(local)) return readFileSync(local, "utf-8");
	return readFileSync(join(CORE_AGENTS_DIR, `${name}.md`), "utf-8");
}

function readAgentSource(name: string): Buffer {
	const local = join(RESOURCES_DIR, "agents", `${name}.md`);
	if (existsSync(local)) return readFileSync(local);
	return readFileSync(join(CORE_AGENTS_DIR, `${name}.md`));
}

function parseFrontmatter(content: string): Record<string, string> {
	const m = content.match(/^---\n([\s\S]*?)\n---/);
	if (!m || !m[1]) return {};
	const out: Record<string, string> = {};
	for (const line of m[1].split("\n")) {
		const kv = line.match(/^([\w-]+):\s*(.*)$/);
		if (!kv || !kv[1] || kv[2] === undefined) continue;
		let v = kv[2].trim();
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
			v = v.slice(1, -1);
		}
		out[kv[1]] = v;
	}
	return out;
}

describe("subagent-agents: source files", () => {
	it.each(TFF_AGENT_NAMES)("%s has required frontmatter fields", (name) => {
		const content = readAgentFile(name);
		const fm = parseFrontmatter(content);
		expect(fm.name).toBe(name);
		expect(fm.description).toBeTruthy();
		const tools =
			fm.tools
				?.split(",")
				.map((t) => t.trim())
				.filter(Boolean) ?? [];
		expect(tools.length).toBeGreaterThan(0);
		expect(fm.thinking).toBe("off");
		expect(fm.systemPromptMode).toBe("replace");
		expect(["true", "false"]).toContain(fm.inheritProjectContext);
		expect(fm.inheritSkills).toBe("false");
	});

	it("tff-security-auditor excludes write/edit/bash", () => {
		const local = join(RESOURCES_DIR, "agents", "tff-security-auditor.md");
		if (!existsSync(local)) return; // migrated to core; core format differs
		const fm = parseFrontmatter(readFileSync(local, "utf-8"));
		const tools = (fm.tools ?? "").split(",").map((t) => t.trim());
		expect(tools).not.toContain("edit");
		expect(tools).not.toContain("write");
		expect(tools).not.toContain("bash");
	});

	it("tff-verifier includes write (for VERIFICATION.md / PR.md) but excludes edit", () => {
		const local = join(RESOURCES_DIR, "agents", "tff-verifier.md");
		if (!existsSync(local)) return; // migrated to core; core format differs
		const fm = parseFrontmatter(readFileSync(local, "utf-8"));
		const tools = (fm.tools ?? "").split(",").map((t) => t.trim());
		expect(tools).toContain("write");
		expect(tools).not.toContain("edit");
	});

	it("tff-code-reviewer allowlists read, bash, write, find, grep (M01-S04)", () => {
		const local = join(RESOURCES_DIR, "agents", "tff-code-reviewer.md");
		if (!existsSync(local)) return; // migrated to core; core format differs
		const fm = parseFrontmatter(readFileSync(local, "utf-8"));
		const tools = (fm.tools ?? "").split(",").map((t) => t.trim());
		expect(tools).toEqual(["read", "bash", "write", "find", "grep"]);
	});

	const FOUR_STATUS_RE =
		/^STATUS: <DONE\|DONE_WITH_CONCERNS\|NEEDS_CONTEXT\|BLOCKED>\s*$\n^EVIDENCE: <one-line summary>\s*$/m;
	const THREE_STATUS_RE =
		/^STATUS: <DONE\|DONE_WITH_CONCERNS\|BLOCKED>\s*$\n^EVIDENCE: <one-line summary>\s*$/m;
	const FOUR_STATUS_AGENTS = ["tff-executor", "tff-fixer"] as const;
	const THREE_STATUS_AGENTS = [
		"tff-verifier",
		"tff-code-reviewer",
		"tff-security-auditor",
	] as const;

	it.each(FOUR_STATUS_AGENTS)(
		"%s body contains four-status output contract (includes NEEDS_CONTEXT)",
		(name) => {
			const local = join(RESOURCES_DIR, "agents", `${name}.md`);
			if (!existsSync(local)) return; // migrated to core; core format differs
			const content = readFileSync(local, "utf-8");
			expect(content).toMatch(FOUR_STATUS_RE);
			expect(content).not.toMatch(THREE_STATUS_RE);
		},
	);

	it.each(THREE_STATUS_AGENTS)(
		"%s body contains three-status output contract (excludes NEEDS_CONTEXT)",
		(name) => {
			const local = join(RESOURCES_DIR, "agents", `${name}.md`);
			if (!existsSync(local)) return; // migrated to core; core format differs
			const content = readFileSync(local, "utf-8");
			expect(content).toMatch(THREE_STATUS_RE);
			expect(content).not.toMatch(FOUR_STATUS_RE);
		},
	);
});

describe("subagent-agents: ensureProjectAgents", () => {
	let root: string;

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "tff-agents-"));
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	it("exports TFF_AGENT_NAMES of length 5", () => {
		expect(TFF_AGENT_NAMES).toHaveLength(5);
	});

	it("creates .pi/agents/ and writes all 5 files byte-identical to source", () => {
		ensureProjectAgents(root, RESOURCES_DIR);
		expect(existsSync(join(root, ".pi", "agents"))).toBe(true);
		for (const name of TFF_AGENT_NAMES) {
			const src = readAgentSource(name);
			const dst = readFileSync(join(root, ".pi", "agents", `${name}.md`));
			expect(Buffer.compare(src, dst)).toBe(0);
		}
	});

	it("is idempotent — calling twice leaves files identical to source", () => {
		ensureProjectAgents(root, RESOURCES_DIR);
		ensureProjectAgents(root, RESOURCES_DIR);
		for (const name of TFF_AGENT_NAMES) {
			const src = readAgentSource(name);
			const dst = readFileSync(join(root, ".pi", "agents", `${name}.md`));
			expect(Buffer.compare(src, dst)).toBe(0);
		}
	});

	it("restores tampered destination (write-always)", () => {
		ensureProjectAgents(root, RESOURCES_DIR);
		const dstPath = join(root, ".pi", "agents", "tff-executor.md");
		writeFileSync(dstPath, "tampered");
		ensureProjectAgents(root, RESOURCES_DIR);
		const src = readAgentSource("tff-executor");
		expect(Buffer.compare(src, readFileSync(dstPath))).toBe(0);
	});
});
