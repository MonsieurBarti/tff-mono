import { describe, expect, it, vi } from "vitest";
import { skillsDriftReportCmd } from "../../../../src/cli/commands/skills-drift-report.cmd.js";

vi.mock("../../../../src/application/skills/drift-report.js", () => ({
	driftReport: vi.fn(async () => [
		{ skill: "test-skill", originalCommitSha: "abc123", drift: 0.05 },
	]),
}));

describe("skills:drift-report", () => {
	it("returns a valid drift report", async () => {
		const result = JSON.parse(await skillsDriftReportCmd([]));
		expect(result.ok).toBe(true);
		expect(Array.isArray(result.data)).toBe(true);
		expect(result.data[0].skill).toBe("test-skill");
	});

	it("fails for unexpected flags", async () => {
		const result = JSON.parse(await skillsDriftReportCmd(["--unknown-flag", "value"]));
		expect(result.ok).toBe(false);
	});
});
