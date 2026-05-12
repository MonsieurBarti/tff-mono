import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isOk } from "@tff/core";
import { ClaudeCodeLifecycleAdapter } from "../../../../../src/infrastructure/adapters/lifecycle/claude-code-lifecycle.adapter.js";

describe("ClaudeCodeLifecycleAdapter — happy path", () => {
	let exitSpy: ReturnType<typeof vi.spyOn>;
	let originalSIGINT: NodeJS.SignalsListener[];
	let originalSIGTERM: NodeJS.SignalsListener[];

	beforeEach(() => {
		exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
		originalSIGINT = process.listeners("SIGINT") as NodeJS.SignalsListener[];
		originalSIGTERM = process.listeners("SIGTERM") as NodeJS.SignalsListener[];
	});

	afterEach(() => {
		exitSpy.mockRestore();
		process.removeAllListeners("SIGINT");
		originalSIGINT.forEach((l) => process.on("SIGINT", l));
		process.removeAllListeners("SIGTERM");
		originalSIGTERM.forEach((l) => process.on("SIGTERM", l));
	});

	it("accepts a session-start handler", async () => {
		const adapter = new ClaudeCodeLifecycleAdapter();
		const res = await adapter.onSessionStart(() => {});
		expect(isOk(res)).toBe(true);
	});

	it("accepts a session-shutdown handler", async () => {
		const adapter = new ClaudeCodeLifecycleAdapter();
		const res = await adapter.onSessionShutdown(() => {});
		expect(isOk(res)).toBe(true);
	});

	it("runs shutdown handlers when SIGINT is received", async () => {
		const adapter = new ClaudeCodeLifecycleAdapter();
		let called = false;
		await adapter.onSessionShutdown(() => {
			called = true;
		});
		process.emit("SIGINT");
		expect(called).toBe(true);
	});
});

describe("ClaudeCodeLifecycleAdapter — error path", () => {
	let exitSpy: ReturnType<typeof vi.spyOn>;
	let originalSIGINT: NodeJS.SignalsListener[];

	beforeEach(() => {
		exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
		originalSIGINT = process.listeners("SIGINT") as NodeJS.SignalsListener[];
	});

	afterEach(() => {
		exitSpy.mockRestore();
		process.removeAllListeners("SIGINT");
		originalSIGINT.forEach((l) => process.on("SIGINT", l));
	});

	it("swallows errors thrown by shutdown handlers", async () => {
		const adapter = new ClaudeCodeLifecycleAdapter();
		let goodCalled = false;
		await adapter.onSessionShutdown(() => {
			throw new Error("boom");
		});
		await adapter.onSessionShutdown(() => {
			goodCalled = true;
		});
		// Should not throw
		process.emit("SIGINT");
		expect(goodCalled).toBe(true);
	});
});
