import { describe, expect, it } from "vitest";
import { workflowNextCmd } from "../../../../src/cli/commands/workflow-next.cmd.js";

describe("workflow:next", () => {
	it("returns next workflow step for valid status", async () => {
		const result = JSON.parse(await workflowNextCmd(["--status", "planning"]));
		expect(result.ok).toBe(true);
		expect(result.data.next).toBeDefined();
		expect(result.data.suggested).toBeDefined();
	});

	it("returns next workflow step for another valid status", async () => {
		const result = JSON.parse(await workflowNextCmd(["--status", "executing"]));
		expect(result.ok).toBe(true);
		expect(result.data.next).toBeDefined();
		expect(result.data.suggested).toBeDefined();
	});

	it("fails when missing required flag", async () => {
		const result = JSON.parse(await workflowNextCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
