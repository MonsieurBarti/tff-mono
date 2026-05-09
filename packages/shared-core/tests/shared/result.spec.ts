import { describe, it, expect } from "vitest";
import { Ok, Err, isOk, isErr, match } from "../../src/domain/shared/result.js";

describe("Result monad", () => {
	it("Ok creates a success result", () => {
		const result = Ok(42);
		expect(result.ok).toBe(true);
		expect(result.data).toBe(42);
	});

	it("Err creates a failure result", () => {
		const result = Err("oops");
		expect(result.ok).toBe(false);
		expect(result.error).toBe("oops");
	});

	it("isOk returns true for Ok", () => {
		expect(isOk(Ok(1))).toBe(true);
		expect(isOk(Err("x"))).toBe(false);
	});

	it("isErr returns true for Err", () => {
		expect(isErr(Err("x"))).toBe(true);
		expect(isErr(Ok(1))).toBe(false);
	});

	it("match calls correct handler", () => {
		const okResult = Ok(10);
		const errResult = Err("fail");

		expect(
			match(okResult, {
				onOk: (n) => n * 2,
				onErr: () => 0,
			}),
		).toBe(20);

		expect(
			match(errResult, {
				onOk: () => 0,
				onErr: (e) => `error: ${e}`,
			}),
		).toBe("error: fail");
	});
});
