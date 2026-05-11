import { describe, it, expect } from "vitest";
import { BaseDomainError } from "../../src/domain/shared/base-domain-error.js";

describe("BaseDomainError", () => {
	it("can be extended with concrete fields", () => {
		class NotFoundError extends BaseDomainError<{ resource: string }> {
			readonly errorLabel = "not_found";
			readonly status = 404;
			readonly context: { resource: string };
			readonly message: string;

			constructor(resource: string) {
				super();
				this.message = `${resource} not found`;
				this.context = { resource };
			}
		}

		const err = new NotFoundError("user");
		expect(err.errorLabel).toBe("not_found");
		expect(err.status).toBe(404);
		expect(err.context).toEqual({ resource: "user" });
		expect(err.message).toBe("user not found");
	});

	it("supports different context shapes", () => {
		class ValidationError extends BaseDomainError<{ field: string; message: string }> {
			readonly errorLabel = "validation_failed";
			readonly status = 422;
			readonly context: { field: string; message: string };
			readonly message: string;

			constructor(field: string, message: string) {
				super();
				this.message = message;
				this.context = { field, message };
			}
		}

		const err = new ValidationError("email", "invalid format");
		expect(err.errorLabel).toBe("validation_failed");
		expect(err.status).toBe(422);
		expect(err.context).toEqual({ field: "email", message: "invalid format" });
		expect(err.message).toBe("invalid format");
	});

	it("supports optional recoveryHint", () => {
		class NotFoundError extends BaseDomainError<{ resource: string }> {
			readonly errorLabel = "not_found";
			readonly status = 404;
			readonly context: { resource: string };
			readonly message: string;

			constructor(resource: string, recoveryHint?: string) {
				super(recoveryHint);
				this.message = `${resource} not found`;
				this.context = { resource };
			}
		}

		const err = new NotFoundError("user", "Check the resource ID and try again");
		expect(err.message).toBe("user not found");
		expect(err.recoveryHint).toBe("Check the resource ID and try again");
	});
});
