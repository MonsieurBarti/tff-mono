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

	it("returns available:true with path when plannotator exists", () => {
		existsSyncMock.mockReturnValue(true);
		const r = checkPlannotator("/any");
		expect(r).toEqual({
			ok: true,
			available: true,
			path: "/home/test/.claude/plugins/data/plannotator-plannotator",
		});
	});

	it("returns available:false with hint when plannotator missing", () => {
		existsSyncMock.mockReturnValue(false);
		const r = checkPlannotator("/any");
		expect(r).toEqual({
			ok: true,
			available: false,
			hint: "Plannotator not installed. See README § Setup Guide for install instructions.",
		});
	});
});
