import { describe, expect, it, vi } from "vitest";
import { makeTask } from "../helpers.js";
import {
	enrichContextWithFff,
	loadAgentResource,
	loadPhaseResources,
} from "../../src/orchestrator.js";

import { PHASE_AGENT } from "../../src/orchestrator.js";

const ALL_PHASES = [
	"discuss",
	"research",
	"plan",
	"execute",
	"verify",
	"review",
	"ship",
	"ship-fix",
] as const;

describe("PHASE_AGENT converged naming", () => {
	it("maps discuss to tff-brainstormer", () => {
		expect(PHASE_AGENT.discuss).toBe("tff-brainstormer");
	});

	it("maps research to tff-researcher", () => {
		expect(PHASE_AGENT.research).toBe("tff-researcher");
	});

	it("maps plan to tff-planner", () => {
		expect(PHASE_AGENT.plan).toBe("tff-planner");
	});

	it("maps execute to tff-executor", () => {
		expect(PHASE_AGENT.execute).toBe("tff-executor");
	});

	it("maps verify to tff-verifier", () => {
		expect(PHASE_AGENT.verify).toBe("tff-verifier");
	});

	it("maps review to tff-code-reviewer", () => {
		expect(PHASE_AGENT.review).toBe("tff-code-reviewer");
	});

	it("maps ship to tff-executor", () => {
		expect(PHASE_AGENT.ship).toBe("tff-executor");
	});

	it("maps ship-fix to tff-inline-fixer", () => {
		expect(PHASE_AGENT["ship-fix"]).toBe("tff-inline-fixer");
	});
});

describe("loadAgentResource core fallback", () => {
	it("returns non-empty content for tff-brainstormer", () => {
		const content = loadAgentResource("tff-brainstormer");
		expect(content.length).toBeGreaterThan(0);
	});

	it("returns non-empty content for tff-researcher", () => {
		const content = loadAgentResource("tff-researcher");
		expect(content.length).toBeGreaterThan(0);
	});

	it("returns non-empty content for tff-planner", () => {
		const content = loadAgentResource("tff-planner");
		expect(content.length).toBeGreaterThan(0);
	});

	it("returns non-empty content for tff-inline-fixer", () => {
		const content = loadAgentResource("tff-inline-fixer");
		expect(content.length).toBeGreaterThan(0);
	});

	it("returns non-empty content for tff-executor", () => {
		const content = loadAgentResource("tff-executor");
		expect(content.length).toBeGreaterThan(0);
	});

	it("returns non-empty content for tff-verifier", () => {
		const content = loadAgentResource("tff-verifier");
		expect(content.length).toBeGreaterThan(0);
	});

	it("returns non-empty content for tff-code-reviewer", () => {
		const content = loadAgentResource("tff-code-reviewer");
		expect(content.length).toBeGreaterThan(0);
	});

	it("returns non-empty content for tff-security-auditor", () => {
		const content = loadAgentResource("tff-security-auditor");
		expect(content.length).toBeGreaterThan(0);
	});
});

describe("loadPhaseResources", () => {
	it.each(ALL_PHASES)("returns agentPrompt and protocol for phase '%s' (smoke)", (phase) => {
		const result = loadPhaseResources(phase);
		expect(result).toHaveProperty("agentPrompt");
		expect(result).toHaveProperty("protocol");
		expect(typeof result.agentPrompt).toBe("string");
		expect(typeof result.protocol).toBe("string");
	});
});

function createTask(title: string) {
	return makeTask({ id: `task-${Math.random()}`, title, createdAt: "", updatedAt: "" });
}

describe("enrichContextWithFff", () => {
	it("adds RELATED_FILES to context when grep returns results", async () => {
		const tasks = [createTask("implement authentication middleware")];
		const fffBridge = {
			grep: vi.fn().mockResolvedValue([{ path: "src/auth.ts" }, { path: "src/middleware.ts" }]),
		};
		const ctx: Record<string, string> = {};

		await enrichContextWithFff(ctx, tasks, fffBridge);

		expect(ctx.RELATED_FILES).toBe("src/auth.ts\nsrc/middleware.ts");
		expect(fffBridge.grep).toHaveBeenCalledOnce();
	});

	it("does nothing when grep returns empty array", async () => {
		const tasks = [createTask("implement database schema")];
		const fffBridge = {
			grep: vi.fn().mockResolvedValue([]),
		};
		const ctx: Record<string, string> = {};

		await enrichContextWithFff(ctx, tasks, fffBridge);

		expect(ctx.RELATED_FILES).toBeUndefined();
	});

	it("does nothing when all task words are 3 chars or fewer", async () => {
		const tasks = [createTask("fix bug")];
		const fffBridge = {
			grep: vi.fn(),
		};
		const ctx: Record<string, string> = {};

		await enrichContextWithFff(ctx, tasks, fffBridge);

		expect(ctx.RELATED_FILES).toBeUndefined();
		expect(fffBridge.grep).not.toHaveBeenCalled();
	});

	it("silently catches errors from fffBridge.grep", async () => {
		const tasks = [createTask("implement feature module")];
		const fffBridge = {
			grep: vi.fn().mockRejectedValue(new Error("bridge unavailable")),
		};
		const ctx: Record<string, string> = {};

		await expect(enrichContextWithFff(ctx, tasks, fffBridge)).resolves.toBeUndefined();
		expect(ctx.RELATED_FILES).toBeUndefined();
	});

	it("does nothing when tasks array is empty", async () => {
		const fffBridge = {
			grep: vi.fn(),
		};
		const ctx: Record<string, string> = {};

		await enrichContextWithFff(ctx, [], fffBridge);

		expect(ctx.RELATED_FILES).toBeUndefined();
		expect(fffBridge.grep).not.toHaveBeenCalled();
	});

	it("passes at most 5 word patterns to grep", async () => {
		const tasks = [createTask("implement alpha beta gamma delta epsilon zeta")];
		const fffBridge = {
			grep: vi.fn().mockResolvedValue([]),
		};
		const ctx: Record<string, string> = {};

		await enrichContextWithFff(ctx, tasks, fffBridge);

		const [patterns] = fffBridge.grep.mock.calls[0] as [string[], unknown];
		expect(patterns.length).toBeLessThanOrEqual(5);
	});
});
