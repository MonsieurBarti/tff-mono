import { describe, expect, it } from "vitest";
import { isErr } from "@tff/core";
import { ClaudeCodeAgentAdapter } from "../../../../../src/infrastructure/adapters/agent/claude-code-agent.adapter.js";

describe("ClaudeCodeAgentAdapter", () => {
	it("always returns error on spawn", async () => {
		const adapter = new ClaudeCodeAgentAdapter();
		const res = await adapter.spawn("do something");
		expect(isErr(res)).toBe(true);
		if (isErr(res)) {
			expect(res.error.context.port).toBe("AgentDispatcher");
			expect(res.error.context.operation).toBe("spawn");
			expect(res.error.message).toContain("Agent dispatch");
		}
	});

	it("includes options in error context cause", async () => {
		const adapter = new ClaudeCodeAgentAdapter();
		const res = await adapter.spawn("task", { agent: "reviewer" });
		expect(isErr(res)).toBe(true);
		if (isErr(res)) {
			expect(res.error.context.cause).toContain("AgentDispatcher is not available");
		}
	});
});
