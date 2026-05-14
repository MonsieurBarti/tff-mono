import { describe, expect, it } from "vitest";
import { skillsDriftCmd } from "../../../../src/cli/commands/skills-drift.cmd.js";

describe("skills:drift", () => {
	it("returns drift result for valid inputs", async () => {
		const result = JSON.parse(
			await skillsDriftCmd(["--original", "old content", "--current", "new content"]),
		);
		expect(result.ok).toBe(true);
		expect(result.data).toBeDefined();
	});

	it("fails when missing required flags", async () => {
		const result = JSON.parse(await skillsDriftCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
