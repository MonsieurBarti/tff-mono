import { describe, expect, it } from "vitest";
import { workflowShouldAutoCmd } from "../../../../src/cli/commands/workflow-should-auto.cmd.js";

describe("workflow:should-auto", () => {
	it("returns autoTransition for valid status and mode", async () => {
		const result = JSON.parse(
			await workflowShouldAutoCmd(["--status", "planning", "--mode", "guided"]),
		);
		expect(result.ok).toBe(true);
		expect(typeof result.data.autoTransition).toBe("boolean");
	});

	it("returns autoTransition for plan-to-pr mode", async () => {
		const result = JSON.parse(
			await workflowShouldAutoCmd(["--status", "verifying", "--mode", "plan-to-pr"]),
		);
		expect(result.ok).toBe(true);
		expect(typeof result.data.autoTransition).toBe("boolean");
	});

	it("fails for invalid mode enum", async () => {
		const result = JSON.parse(
			await workflowShouldAutoCmd(["--status", "planning", "--mode", "invalid"]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("INVALID_ENUM_VALUE");
	});

	it("fails when missing required flags", async () => {
		const result = JSON.parse(await workflowShouldAutoCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
