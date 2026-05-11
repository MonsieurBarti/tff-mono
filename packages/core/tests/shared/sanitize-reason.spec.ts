import { describe, it, expect } from "vitest";
import { sanitizeReason } from "../../src/shared/sanitize-reason.js";

describe("sanitizeReason", () => {
	it("returns undefined for undefined input", () => {
		expect(sanitizeReason(undefined)).toBeUndefined();
	});

	it("returns undefined for all-whitespace input", () => {
		expect(sanitizeReason("   ")).toBeUndefined();
		expect(sanitizeReason("\t\n ")).toBeUndefined();
	});

	it("strips ASCII control characters", () => {
		const input = "hello\x00world\x01\x02";
		expect(sanitizeReason(input)).toBe("hello world");
	});

	it("strips newlines and tabs", () => {
		const input = "line1\nline2\tindented";
		expect(sanitizeReason(input)).toBe("line1 line2 indented");
	});

	it("strips DEL character (0x7F)", () => {
		const input = "hello\x7Fworld";
		expect(sanitizeReason(input)).toBe("hello world");
	});

	it("trims surrounding whitespace", () => {
		const input = "  valid reason  ";
		expect(sanitizeReason(input)).toBe("valid reason");
	});

	it("returns clean input unchanged", () => {
		const input = "This is a clean reason.";
		expect(sanitizeReason(input)).toBe("This is a clean reason.");
	});

	it("collapses multiple control chars to single spaces", () => {
		const input = "a\x00\x01\x02b";
		expect(sanitizeReason(input)).toBe("a   b");
	});
});
