import { describe, expect, it } from "vitest";
import { sliceClassifyCmd } from "../../../../src/cli/commands/slice-classify.cmd.js";

describe("slice:classify", () => {
	it("classifies valid signals", async () => {
		const result = JSON.parse(
			await sliceClassifyCmd(["--signals", JSON.stringify({ hasResearch: true, taskCount: 5 })]),
		);
		expect(result.ok).toBe(true);
		expect(result.data.tier).toBeDefined();
	});

	it("returns error for invalid signals (catch block)", async () => {
		const result = JSON.parse(await sliceClassifyCmd(["--signals", "null"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("INVALID_ARGS");
	});

	it("fails when missing required flag", async () => {
		const result = JSON.parse(await sliceClassifyCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
