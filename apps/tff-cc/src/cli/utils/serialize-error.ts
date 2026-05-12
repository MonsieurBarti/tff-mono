import type { BaseDomainError } from "@tff/core";

export interface SerializedError {
	code: string;
	message: string;
	recoveryHint?: string;
}

export const serializeError = (err: BaseDomainError<unknown>): SerializedError => {
	return {
		code: err.errorLabel,
		message: err.message,
		recoveryHint: err.recoveryHint,
	};
};
