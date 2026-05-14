import { describe, expect, it, vi } from "vitest";
import {
	COMMAND_REGISTRY,
	generateHelp,
	handleEntryPointError,
	main,
	schemaToJsonSchema,
} from "../../../src/cli/index.js";
import { NativeBindingError } from "../../../src/infrastructure/adapters/sqlite/native-binding-error.js";

vi.mock("../../../src/application/recovery/handle-startup-recovery.js", () => ({
	handleStartupRecovery: vi.fn().mockResolvedValue({ threw: false }),
}));

describe("CLI index.ts", () => {
	it("handleEntryPointError with NativeBindingError returns toJSON", () => {
		const err = new NativeBindingError({
			platform: "darwin",
			arch: "arm64",
			nodeAbi: "127",
			candidates: [],
		});
		const result = JSON.parse(handleEntryPointError(err));
		expect(result.ok).toBe(false);
		expect(result.error).toEqual(err.toJSON());
	});

	it("handleEntryPointError with generic Error returns INTERNAL_ERROR", () => {
		const err = new Error("something went wrong");
		const result = JSON.parse(handleEntryPointError(err));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("INTERNAL_ERROR");
		expect(result.error.message).toBe(String(err));
	});

	it("generateHelp produces valid JSON for a schema", () => {
		const schema = COMMAND_REGISTRY["workflow:next"].schema;
		const result = JSON.parse(generateHelp(schema));
		expect(result.ok).toBe(true);
		expect(result.data.name).toBe("workflow:next");
		expect(result.data.requiredFlags).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: "--status" })]),
		);
	});

	it("schemaToJsonSchema produces object with required flags", () => {
		const schema = COMMAND_REGISTRY["workflow:next"].schema;
		const result = schemaToJsonSchema(schema);
		expect(result.type).toBe("object");
		expect(result.required).toContain("status");
		expect(result.properties?.status).toBeDefined();
	});

	describe("main dispatch", () => {
		const mockLog = vi.spyOn(console, "log").mockImplementation(() => {});

		afterEach(() => {
			mockLog.mockClear();
		});

		afterAll(() => {
			mockLog.mockRestore();
		});

		it("--help outputs command list including version", async () => {
			const originalArgv = process.argv;
			process.argv = ["node", "cli.js", "--help"];
			try {
				await main();
				const output = JSON.parse(mockLog.mock.calls[0][0]);
				expect(output.ok).toBe(true);
				expect(output.data.name).toBe("tff-tools");
				expect(output.data.version).toBeDefined();
				expect(output.data.commands).toEqual(expect.arrayContaining(["workflow:next", "version"]));
			} finally {
				process.argv = originalArgv;
			}
		});

		it("--version outputs version string", async () => {
			const originalArgv = process.argv;
			process.argv = ["node", "cli.js", "--version"];
			try {
				await main();
				expect(mockLog).toHaveBeenCalled();
				const output = mockLog.mock.calls[0][0];
				expect(typeof output).toBe("string");
				expect(output.length).toBeGreaterThan(0);
			} finally {
				process.argv = originalArgv;
			}
		});

		it("workflow:next --status planning dispatches correctly", async () => {
			const originalArgv = process.argv;
			process.argv = ["node", "cli.js", "workflow:next", "--status", "planning"];
			try {
				await main();
				const output = JSON.parse(mockLog.mock.calls[0][0]);
				expect(output.ok).toBe(true);
				expect(output.data.next).toBeDefined();
				expect(output.data.suggested).toBeDefined();
			} finally {
				process.argv = originalArgv;
			}
		});

		it("per-command --help returns help JSON", async () => {
			const originalArgv = process.argv;
			process.argv = ["node", "cli.js", "workflow:next", "--help"];
			try {
				await main();
				const output = JSON.parse(mockLog.mock.calls[0][0]);
				expect(output.ok).toBe(true);
				expect(output.data.name).toBe("workflow:next");
				expect(output.data.syntax).toBeDefined();
			} finally {
				process.argv = originalArgv;
			}
		});

		it("--help --json outputs schema format", async () => {
			const originalArgv = process.argv;
			process.argv = ["node", "cli.js", "workflow:next", "--help", "--json"];
			try {
				await main();
				const output = JSON.parse(mockLog.mock.calls[0][0]);
				expect(output.ok).toBe(true);
				expect(output.data.command).toBe("workflow:next");
				expect(output.data.flags.type).toBe("object");
				expect(output.data.flags.required).toContain("status");
			} finally {
				process.argv = originalArgv;
			}
		});

		it("unknown command returns UNKNOWN_COMMAND", async () => {
			const originalArgv = process.argv;
			process.argv = ["node", "cli.js", "unknown:command"];
			try {
				await main();
				const output = JSON.parse(mockLog.mock.calls[0][0]);
				expect(output.ok).toBe(false);
				expect(output.error.code).toBe("UNKNOWN_COMMAND");
			} finally {
				process.argv = originalArgv;
			}
		});
	});
});
