import { beforeEach, describe, expect, it, vi } from "vitest";

const existsSyncMock = vi.hoisted(() => vi.fn());
const homedirMock = vi.hoisted(() => vi.fn(() => "/home/test"));

vi.mock("node:fs", () => ({
	existsSync: existsSyncMock,
}));

vi.mock("node:os", () => ({
	homedir: homedirMock,
}));

import {
	plannotatorCheckCmd,
	plannotatorCheckSchema,
} from "../../../../src/cli/commands/plannotator-check.cmd.js";

describe("plannotatorCheckCmd", () => {
	beforeEach(() => {
		existsSyncMock.mockReset();
		homedirMock.mockReturnValue("/home/test");
	});

	it("schema declares plannotator:check command with no flags", () => {
		expect(plannotatorCheckSchema.name).toBe("plannotator:check");
		expect(plannotatorCheckSchema.mutates).toBe(false);
		expect(plannotatorCheckSchema.requiredFlags).toEqual([]);
		expect(plannotatorCheckSchema.optionalFlags).toEqual([]);
	});

	it("returns available:true when plannotator path exists", async () => {
		existsSyncMock.mockReturnValue(true);
		const out = JSON.parse(await plannotatorCheckCmd([]));
		expect(out.ok).toBe(true);
		expect(out.data.available).toBe(true);
		expect(out.data.path).toBe("/home/test/.claude/plugins/data/plannotator-plannotator");
		expect(out.data.hint).toBeUndefined();
	});

	it("returns available:false with hint when plannotator missing", async () => {
		existsSyncMock.mockReturnValue(false);
		const out = JSON.parse(await plannotatorCheckCmd([]));
		expect(out.ok).toBe(true);
		expect(out.data.available).toBe(false);
		expect(out.data.hint).toBe(
			"Plannotator not installed. See README § Setup Guide for install instructions.",
		);
		expect(out.data.path).toBeUndefined();
	});
});
