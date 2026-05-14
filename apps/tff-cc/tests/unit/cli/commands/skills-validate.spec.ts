import { describe, expect, it } from "vitest";
import { skillsValidateCmd } from "../../../../src/cli/commands/skills-validate.cmd.js";

describe("skills:validate", () => {
	it("validates a valid skill definition", async () => {
		const skill = { name: "test-skill", description: "A test skill", domains: ["test"] };
		const result = JSON.parse(await skillsValidateCmd(["--skill", JSON.stringify(skill)]));
		expect(result.ok).toBe(true);
		expect(result.data).toBeDefined();
	});

	it("returns error for invalid skill (catch block)", async () => {
		const result = JSON.parse(await skillsValidateCmd(["--skill", "null"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("INVALID_ARGS");
	});

	it("fails when missing required flag", async () => {
		const result = JSON.parse(await skillsValidateCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
