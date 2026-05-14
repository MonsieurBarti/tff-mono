import { describe, expect, it } from "vitest";
import { schemaCmd } from "../../../../src/cli/commands/schema.cmd.js";

describe("schema", () => {
	it("returns JSON schema for a valid command", async () => {
		const result = JSON.parse(await schemaCmd(["--command", "slice:transition"]));
		expect(result.ok).toBe(true);
		expect(result.data.command).toBe("slice:transition");
		expect(result.data.flags.type).toBe("object");
		expect(result.data.flags.required).toContain("slice-id");
		expect(result.data.flags.required).toContain("status");
	});

	it("returns error for unknown command", async () => {
		const result = JSON.parse(await schemaCmd(["--command", "unknown:command"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("UNKNOWN_COMMAND");
	});

	it("returns error when missing --command", async () => {
		const result = JSON.parse(await schemaCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});
