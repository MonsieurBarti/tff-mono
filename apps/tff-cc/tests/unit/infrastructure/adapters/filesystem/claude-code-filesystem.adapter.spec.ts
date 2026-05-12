import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isOk, isErr } from "@tff/core";
import { ClaudeCodeFileSystemAdapter } from "../../../../../src/infrastructure/adapters/filesystem/claude-code-filesystem.adapter.js";

let tmpDir: string;
let fs: ClaudeCodeFileSystemAdapter;

beforeEach(() => {
	tmpDir = mkdtempSync(join(tmpdir(), "tff-fs-"));
	fs = new ClaudeCodeFileSystemAdapter();
});

afterEach(() => {
	rmSync(tmpDir, { recursive: true, force: true });
});

describe("ClaudeCodeFileSystemAdapter — happy path", () => {
	it("reads a file", async () => {
		const path = join(tmpDir, "test.txt");
		writeFileSync(path, "hello", "utf8");
		const res = await fs.readFile(path);
		expect(isOk(res)).toBe(true);
		if (isOk(res)) expect(res.data).toBe("hello");
	});

	it("writes a file", async () => {
		const path = join(tmpDir, "write.txt");
		const res = await fs.writeFile(path, "world");
		expect(isOk(res)).toBe(true);
	});

	it("returns true when path exists", async () => {
		const path = join(tmpDir, "exists.txt");
		writeFileSync(path, "", "utf8");
		const res = await fs.exists(path);
		expect(isOk(res)).toBe(true);
		if (isOk(res)) expect(res.data).toBe(true);
	});

	it("creates a directory", async () => {
		const path = join(tmpDir, "nested", "dir");
		const res = await fs.mkdir(path, true);
		expect(isOk(res)).toBe(true);
	});

	it("reads a directory", async () => {
		mkdirSync(join(tmpDir, "sub"), { recursive: true });
		writeFileSync(join(tmpDir, "a.txt"), "", "utf8");
		writeFileSync(join(tmpDir, "sub", "b.txt"), "", "utf8");
		const res = await fs.readdir(tmpDir);
		expect(isOk(res)).toBe(true);
		if (isOk(res)) {
			expect(res.data.length).toBe(2);
			expect(res.data.some((e) => e.path.endsWith("a.txt") && !e.isDirectory)).toBe(true);
			expect(res.data.some((e) => e.path.endsWith("sub") && e.isDirectory)).toBe(true);
		}
	});
});

describe("ClaudeCodeFileSystemAdapter — error path", () => {
	it("returns error when reading missing file", async () => {
		const res = await fs.readFile(join(tmpDir, "missing.txt"));
		expect(isErr(res)).toBe(true);
		if (isErr(res)) {
			expect(res.error.context.port).toBe("FileSystem");
			expect(res.error.context.operation).toBe("readFile");
		}
	});

	it("returns false when path does not exist", async () => {
		const res = await fs.exists(join(tmpDir, "nope.txt"));
		expect(isOk(res)).toBe(true);
		if (isOk(res)) expect(res.data).toBe(false);
	});

	it("returns error when reading non-directory", async () => {
		const path = join(tmpDir, "notadir.txt");
		writeFileSync(path, "", "utf8");
		const res = await fs.readdir(path);
		expect(isErr(res)).toBe(true);
		if (isErr(res)) {
			expect(res.error.context.port).toBe("FileSystem");
			expect(res.error.context.operation).toBe("readdir");
		}
	});
});
