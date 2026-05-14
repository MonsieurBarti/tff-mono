import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { readLogCursor, writeLogCursor } from "../../../src/common/log-cursor.js";

describe("readLogCursor", () => {
	test("returns null/0 when file is missing", () => {
		const root = mkdtempSync(join(tmpdir(), "tff-cursor-missing-"));
		const result = readLogCursor(root);
		expect(result).toEqual({ lastHash: null, lastRow: 0 });
		rmSync(root, { recursive: true, force: true });
	});
});

describe("writeLogCursor + readLogCursor round-trip", () => {
	test("persists and reads back cursor values", () => {
		const root = mkdtempSync(join(tmpdir(), "tff-cursor-roundtrip-"));
		writeLogCursor(root, "abc123", 42);
		const result = readLogCursor(root);
		expect(result).toEqual({ lastHash: "abc123", lastRow: 42 });
		rmSync(root, { recursive: true, force: true });
	});

	test("overwrites previous values", () => {
		const root = mkdtempSync(join(tmpdir(), "tff-cursor-overwrite-"));
		writeLogCursor(root, "first", 1);
		writeLogCursor(root, "second", 2);
		const result = readLogCursor(root);
		expect(result).toEqual({ lastHash: "second", lastRow: 2 });
		rmSync(root, { recursive: true, force: true });
	});
});
