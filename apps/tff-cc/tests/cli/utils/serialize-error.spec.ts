import { describe, it, expect } from "vitest";
import { serializeError } from "../../../src/cli/utils/serialize-error.js";
import { BaseDomainError } from "@tff/core";

class TestError extends BaseDomainError<{ id: string }> {
	readonly errorLabel = "TEST_ERROR";
	readonly status = 500;
	readonly context: { id: string };
	readonly message: string;
	readonly recoveryHint?: string;

	constructor(message: string, id: string, recoveryHint?: string) {
		super();
		this.message = message;
		this.context = { id };
		this.recoveryHint = recoveryHint;
	}
}

describe("serializeError", () => {
	it("serializes code, message, and recoveryHint", () => {
		const err = new TestError("Something failed", "123", "Try again");
		expect(serializeError(err)).toEqual({
			code: "TEST_ERROR",
			message: "Something failed",
			recoveryHint: "Try again",
		});
	});

	it("omits recoveryHint when undefined", () => {
		const err = new TestError("Oops", "456");
		const result = serializeError(err);
		expect(result.code).toBe("TEST_ERROR");
		expect(result.message).toBe("Oops");
		expect(result.recoveryHint).toBeUndefined();
	});
});
