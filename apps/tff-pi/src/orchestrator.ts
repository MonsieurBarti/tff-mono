import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";
import { readArtifact, milestoneLabel, sliceLabel, type SliceStatus } from "@tff/core";
import {
	getActiveMilestone,
	getActiveSlice,
	getProject,
	getSlice,
	getTasksByWave,
} from "./common/db.js";
import type { Phase, Slice, Task, Tier } from "./common/dto.js";

export type { Phase };

/** Prompt structure for phase prompts (kept for backward compat with tests). */
export interface PhasePrompt {
	systemPrompt: string;
	userPrompt: string;
	tools: string[];
	label: string;
}

export const RESOURCES_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "resources");

const CORE_PROTOCOLS_DIR = join(
	RESOURCES_DIR,
	"..",
	"..",
	"..",
	"..",
	"packages",
	"core",
	"src",
	"content",
	"protocols",
);

const CORE_SKILLS_DIR = join(
	RESOURCES_DIR,
	"..",
	"..",
	"..",
	"..",
	"packages",
	"core",
	"src",
	"content",
	"skills",
);

const CORE_AGENTS_DIR = join(
	RESOURCES_DIR,
	"..",
	"..",
	"..",
	"..",
	"packages",
	"core",
	"src",
	"content",
	"agents",
);

export function findActiveSlice(db: Database.Database): Slice | null {
	const project = getProject(db);
	if (!project) return null;
	const milestone = getActiveMilestone(db, project.id);
	if (!milestone) return null;
	return getActiveSlice(db, milestone.id);
}

export function determineNextPhase(status: SliceStatus, tier?: Tier | null): Phase | null {
	switch (status) {
		case "created":
			return "discuss";
		case "discussing":
			return tier === "S" ? "plan" : "research";
		case "researching":
			return "plan";
		case "planning":
			return "execute";
		case "executing":
			return "verify";
		case "verifying":
			return "review";
		case "reviewing":
			return "ship";
		default:
			return null;
	}
}

function loadResource(path: string): string {
	try {
		return readFileSync(path, "utf-8");
	} catch {
		// Fallback: shared protocols may have been migrated to core
		const filename = basename(path);
		const corePath = join(CORE_PROTOCOLS_DIR, filename);
		try {
			let content = readFileSync(corePath, "utf-8");
			// Placeholder resolution for tff-pi context
			content = content.replace(/\{\{project-dir\}\}/g, ".tff");
			return content;
		} catch {
			return "";
		}
	}
}

export function loadSkill(skillName: string): string {
	validateResourceName(skillName);
	const localPath = join(RESOURCES_DIR, "skills", skillName, "SKILL.md");
	try {
		return readFileSync(localPath, "utf-8");
	} catch {
		const corePath = join(CORE_SKILLS_DIR, skillName, "SKILL.md");
		try {
			return readFileSync(corePath, "utf-8");
		} catch {
			return "";
		}
	}
}

export const PHASE_AGENT: Record<Phase, string> = {
	discuss: "tff-brainstormer",
	research: "tff-researcher",
	plan: "tff-planner",
	execute: "tff-executor",
	verify: "tff-verifier",
	review: "tff-code-reviewer",
	ship: "tff-executor",
	"ship-fix": "tff-inline-fixer",
};

export const PHASE_TOOLS: Record<Phase, string[]> = {
	discuss: [
		"tff_classify",
		"tff_write_spec",
		"tff_write_requirements",
		"tff_query_state",
		"tff_ask_user",
	],
	research: [
		"tff_write_research",
		"tff_query_state",
		"tff-fff_find",
		"tff-fff_grep",
		"tff-fff_search",
	],
	plan: ["tff_write_plan", "tff_query_state", "tff-fff_find", "tff-fff_grep", "tff_ask_user"],
	execute: [],
	verify: [],
	review: [],
	ship: ["tff_query_state"],
	"ship-fix": ["tff_ask_user", "tff_ship_apply_done"],
};

function validateResourceName(name: string): void {
	if (
		!/^[a-z0-9-]{1,64}$/.test(name) ||
		name.startsWith("-") ||
		name.endsWith("-") ||
		name.includes("--")
	) {
		throw new Error(`Invalid resource name: ${name}`);
	}
}

export function loadAgentResource(agentName: string): string {
	validateResourceName(agentName);
	const localPath = join(RESOURCES_DIR, "agents", `${agentName}.md`);
	try {
		return readFileSync(localPath, "utf-8");
	} catch {
		const corePath = join(CORE_AGENTS_DIR, `${agentName}.md`);
		try {
			return readFileSync(corePath, "utf-8");
		} catch {
			return "";
		}
	}
}

export function loadPhaseResources(phase: Phase): { agentPrompt: string; protocol: string } {
	const agentName = PHASE_AGENT[phase];
	const agentPrompt = loadAgentResource(agentName);
	const protocolFile = phase === "discuss" ? "discuss-interactive" : phase;
	const protocol = loadResource(join(RESOURCES_DIR, "protocols", `${protocolFile}.md`));
	return { agentPrompt, protocol };
}

export function collectPhaseContext(
	root: string,
	slice: Slice,
	milestoneNumber: number,
	phase: Phase,
): Record<string, string> {
	const ctx: Record<string, string> = {};
	const mLabel = milestoneLabel(milestoneNumber);
	const sLabel = sliceLabel(milestoneNumber, slice.number);

	const projectMd = readArtifact(root, "PROJECT.md");
	if (projectMd) ctx["PROJECT.md"] = projectMd;

	const reqMd = readArtifact(root, `milestones/${mLabel}/REQUIREMENTS.md`);
	if (reqMd) ctx["REQUIREMENTS.md"] = reqMd;

	if (phase === "research" || phase === "plan") {
		const specMd = readArtifact(root, `milestones/${mLabel}/slices/${sLabel}/SPEC.md`);
		if (specMd) ctx["SPEC.md"] = specMd;
	}

	if (phase === "plan") {
		const researchMd = readArtifact(root, `milestones/${mLabel}/slices/${sLabel}/RESEARCH.md`);
		if (researchMd) ctx["RESEARCH.md"] = researchMd;
	}

	return ctx;
}

export function buildPhasePrompt(
	slice: Slice,
	milestoneNumber: number,
	phase: Phase,
	context: Record<string, string>,
	compressed: boolean,
): PhasePrompt {
	const agentName = PHASE_AGENT[phase];
	const agentMd = loadAgentResource(agentName);
	const protocolMd = loadResource(join(RESOURCES_DIR, "protocols", `${phase}.md`));

	const sLabel = sliceLabel(milestoneNumber, slice.number);

	let systemPrompt = agentMd;
	if (protocolMd) {
		systemPrompt += `\n\n${protocolMd}`;
	}

	const contextBlock = Object.entries(context)
		.map(([name, content]) => {
			return `### ${name}\n\n${content}`;
		})
		.join("\n\n");

	const parts = [
		`## Slice: ${sLabel} — "${slice.title}"`,
		`Slice ID: ${slice.id}`,
		`Tier: ${slice.tier ?? "unclassified"}`,
		"",
		"## Context",
		"",
		contextBlock,
	];

	if (compressed) {
		parts.push(
			"",
			"**IMPORTANT:** Write all artifact content in compressed R1-R10 notation. Preserve: code blocks, file paths, AC checkboxes.",
		);
	}

	const userPrompt = parts.join("\n");

	return {
		systemPrompt,
		userPrompt,
		tools: PHASE_TOOLS[phase],
		label: `${phase}:${sLabel}`,
	};
}

export async function enrichContextWithFff(
	ctx: Record<string, string>,
	tasks: Task[],
	fffBridge: {
		grep: (patterns: string[], opts?: { maxResults?: number }) => Promise<Array<{ path: string }>>;
	},
): Promise<void> {
	const filePatterns = tasks
		.flatMap((t) => t.title.split(/\s+/))
		.filter((w) => w.length > 3)
		.slice(0, 5);
	if (filePatterns.length === 0) return;

	try {
		const results = await fffBridge.grep(filePatterns, { maxResults: 10 });
		if (results.length > 0) {
			ctx.RELATED_FILES = results.map((r) => r.path).join("\n");
		}
	} catch {
		// Best-effort — don't fail the phase
	}
}

export function verifyPhaseArtifacts(
	db: Database.Database,
	root: string,
	slice: Slice,
	milestoneNumber: number,
	phase: Phase,
): { ok: boolean; missing: string[] } {
	const mLabel = milestoneLabel(milestoneNumber);
	const sLabel = sliceLabel(milestoneNumber, slice.number);
	const missing: string[] = [];

	if (phase === "discuss") {
		if (!readArtifact(root, `milestones/${mLabel}/slices/${sLabel}/SPEC.md`)) {
			missing.push("SPEC.md");
		}
		if (!readArtifact(root, `milestones/${mLabel}/slices/${sLabel}/REQUIREMENTS.md`)) {
			missing.push("REQUIREMENTS.md");
		}
		const refreshed = getSlice(db, slice.id);
		if (!refreshed?.tier) {
			missing.push("tier classification");
		}
	} else if (phase === "research") {
		const refreshed = getSlice(db, slice.id);
		if (refreshed?.tier === "SSS") {
			if (!readArtifact(root, `milestones/${mLabel}/slices/${sLabel}/RESEARCH.md`)) {
				missing.push("RESEARCH.md (required for SSS)");
			}
		}
	} else if (phase === "plan") {
		if (!readArtifact(root, `milestones/${mLabel}/slices/${sLabel}/PLAN.md`)) {
			missing.push("PLAN.md");
		}
		const waveMap = getTasksByWave(db, slice.id);
		if (waveMap.size === 0) {
			missing.push("tasks persisted in DB (tff_write_plan must be called)");
		}
	} else if (phase === "verify") {
		if (!readArtifact(root, `milestones/${mLabel}/slices/${sLabel}/VERIFICATION.md`)) {
			missing.push("VERIFICATION.md");
		}
		// Audit block marker — written by the verify finalizer when the
		// evidence auditor finds claim/tool-call mismatches. Its presence
		// means the phase is incomplete even if VERIFICATION.md exists.
		if (readArtifact(root, `milestones/${mLabel}/slices/${sLabel}/.audit-blocked`)) {
			missing.push(
				"audit mismatches must be resolved (re-run the verify phase so the subagent produces a clean VERIFICATION.md)",
			);
		}
	} else if (phase === "review") {
		if (!readArtifact(root, `milestones/${mLabel}/slices/${sLabel}/REVIEW.md`)) {
			missing.push("REVIEW.md");
		}
	}

	return { ok: missing.length === 0, missing };
}

/**
 * Returns the phase whose artifacts must exist before entering `target`.
 * null means no precondition (e.g., discuss is the first phase).
 */
export function predecessorPhase(target: Phase, tier?: Tier | null): Phase | null {
	switch (target) {
		case "discuss":
			return null;
		case "research":
			return "discuss";
		case "plan":
			return tier === "S" ? "discuss" : "research";
		case "execute":
			return "plan";
		case "verify":
			// verify.ts has an inline empty-diff gate that catches "execute produced
			// nothing" better than an artifact check. We still return "execute" here
			// so `closePredecessorIfReady` can mark execute complete when verify
			// starts — verifyPhaseArtifacts has no execute-case, so the artifact
			// check is a no-op (ok=true).
			return "execute";
		case "review":
			return "verify";
		case "ship":
			return "review";
		case "ship-fix":
			// Side-channel phase — not part of the discuss→ship pipeline, so it
			// has no predecessor in the state machine sense.
			return null;
		default:
			return null;
	}
}
