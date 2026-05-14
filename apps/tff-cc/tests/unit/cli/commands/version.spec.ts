import { describe, expect, it, vi } from "vitest";
import { versionCmd } from "../../../../src/cli/commands/version.cmd.js";

vi.mock("../../../../src/application/recovery/recovery-marker.js", () => ({
	readRecoveryMarker: async () => null,
}));

vi.mock("../../../../src/infrastructure/adapters/sqlite/open-database.js", () => ({
	openDatabaseWithTrace: () => {
		throw new Error("binding unavailable");
	},
}));

describe("version", () => {
	it("returns version without verbose", async () => {
		const result = JSON.parse(await versionCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.version).toBeDefined();
	});

	it("returns verbose diagnostics", async () => {
		const result = JSON.parse(await versionCmd(["--verbose"]));
		expect(result.ok).toBe(true);
		expect(result.data.version).toBeDefined();
		expect(result.data.binding).toBeNull();
		expect(result.data.nodeAbi).toBeDefined();
		expect(result.data.lastRecovery.status).toBe("ok");
	});
});
