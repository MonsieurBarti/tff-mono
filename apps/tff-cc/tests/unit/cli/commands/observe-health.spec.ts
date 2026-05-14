import { describe, expect, it, vi } from "vitest";
import { observeHealthCmd } from "../../../../src/cli/commands/observe-health.cmd.js";

vi.mock("../../../../src/application/observations/health-checks.js", () => ({
	checkLastObservation: () => ({ status: "ok", daysSinceLastObservation: 0 }),
	checkFirstObservationSentinel: () => ({ status: "ok" }),
	auditDeadLetter: () => ({ status: "ok", count: 0 }),
	checkPlannotator: () => ({ status: "ok", hasPlannotator: true }),
}));

describe("observe:health", () => {
	it("returns health status", async () => {
		const result = JSON.parse(await observeHealthCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.lastObservation.status).toBe("ok");
		expect(result.data.plannotator.status).toBe("ok");
	});
});
