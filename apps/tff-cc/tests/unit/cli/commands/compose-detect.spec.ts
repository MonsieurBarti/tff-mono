import { describe, expect, it } from "vitest";
import { composeDetectCmd } from "../../../../src/cli/commands/compose-detect.cmd.js";

describe("compose:detect", () => {
	it("detects clusters from valid observations", async () => {
		const observations = [{ tool: "Read" }, { tool: "Write" }];
		const result = JSON.parse(
			await composeDetectCmd(["--observations", JSON.stringify(observations)]),
		);
		expect(result.ok).toBe(true);
		expect(Array.isArray(result.data)).toBe(true);
	});

	it("returns error for invalid observations (catch block)", async () => {
		const result = JSON.parse(await composeDetectCmd(["--observations", "null"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("INVALID_ARGS");
	});

	it("fails when missing required flag", async () => {
		const result = JSON.parse(await composeDetectCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
