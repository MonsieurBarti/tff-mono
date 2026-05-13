import { beforeEach, describe, expect, it, vi } from "vitest";

const existsSyncMock = vi.hoisted(() => vi.fn());
const homedirMock = vi.hoisted(() => vi.fn(() => "/home/test"));

vi.mock("node:fs", () => ({
	__esModule: true,
	default: { existsSync: existsSyncMock },
	existsSync: existsSyncMock,
}));

vi.mock("node:os", () => ({
	__esModule: true,
	default: { homedir: homedirMock },
	homedir: homedirMock,
}));

import { checkPlannotator } from "../../../../src/application/observations/health-checks.js";

describe("checkPlannotator", () => {
	beforeEach(() => {
		existsSyncMock.mockReset();
		homedirMock.mockReturnValue("/home/test");
	});

	it("returns available:true when plugin path exists", () => {
		existsSyncMock.mockReturnValue(true);
		const result = checkPlannotator("/any/root");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.available).toBe(true);
			expect(result.path).toBe("/home/test/.claude/plugins/data/plannotator-plannotator");
		}
	});

	it("returns available:false with hint when plugin path missing", () => {
		existsSyncMock.mockReturnValue(false);
		const result = checkPlannotator("/any/root");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.available).toBe(false);
			expect(result.hint).toContain("README");
		}
	});
});
