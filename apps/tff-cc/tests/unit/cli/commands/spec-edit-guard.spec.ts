import { beforeEach, describe, expect, it, vi } from "vitest";
import { specEditGuardCmd } from "../../../../src/cli/commands/spec-edit-guard.cmd.js";

const { getGuardsDisabled, setGuardsDisabled } = vi.hoisted(() => {
	let _disabled = false;
	return {
		getGuardsDisabled: () => _disabled,
		setGuardsDisabled: (v: boolean) => {
			_disabled = v;
		},
	};
});

const { getProjectInitialized, setProjectInitialized } = vi.hoisted(() => {
	let _init = true;
	return {
		getProjectInitialized: () => _init,
		setProjectInitialized: (v: boolean) => {
			_init = v;
		},
	};
});

vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs")>();
	return {
		...actual,
		existsSync: vi.fn((p: string) => {
			if (p.includes(".tff") && !p.includes("settings.yaml")) return getProjectInitialized();
			if (p.includes("settings.yaml")) return true;
			return actual.existsSync(p);
		}),
		readFileSync: vi.fn((p: string, ...args: any[]) => {
			if (p.includes("settings.yaml")) {
				return getGuardsDisabled() ? "workflow:\n  guards: false\n" : "";
			}
			return actual.readFileSync(p, ...args);
		}),
	};
});

describe("spec-edit:guard", () => {
	beforeEach(() => {
		setGuardsDisabled(false);
		setProjectInitialized(true);
	});

	it("returns ok when --help is passed", async () => {
		const result = JSON.parse(await specEditGuardCmd(["--help"]));
		expect(result.ok).toBe(true);
		expect(result.data.warning).toBeNull();
	});

	it("returns null warning when guards are disabled", async () => {
		setGuardsDisabled(true);
		const result = JSON.parse(await specEditGuardCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.warning).toBeNull();
	});

	it("returns null warning when project not initialized", async () => {
		setProjectInitialized(false);
		const result = JSON.parse(await specEditGuardCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.warning).toBeNull();
	});

	it("returns null warning when no file path provided", async () => {
		const result = JSON.parse(await specEditGuardCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.warning).toBeNull();
	});

	it("returns error for unknown flag", async () => {
		const result = JSON.parse(await specEditGuardCmd(["--file-path", "SPEC.md"]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("UNKNOWN_FLAG");
	});
});
