import { BaseDomainError } from "@tff/core";

const DEFAULT_STATUS = 500;

const STATUS_MAP: Record<string, number> = {
	NOT_FOUND: 404,
	ALREADY_CLAIMED: 409,
	PRECONDITION_VIOLATION: 422,
	VALIDATION_ERROR: 400,
	WRITE_FAILURE: 500,
	ROUTING_CONFIG: 400,
	JOURNAL_WRITE_FAILED: 500,
	JOURNAL_READ_FAILED: 500,
	CORRUPTED_STATE: 500,
	EXTERNAL_CALL_FAILED: 500,
	GIT_CONFLICT: 409,
	DETACHED_HEAD: 400,
	TRANSACTION_ROLLBACK: 500,
	PARTIAL_SUCCESS: 200,
	FRESH_REVIEWER_VIOLATION: 422,
	HAS_OPEN_CHILDREN: 422,
	MILESTONE_COMPLETENESS_VIOLATION: 422,
	SHIP_COMPLETENESS_VIOLATION: 422,
	VERSION_MISMATCH: 500,
};

export type DomainError = {
	code: string;
	message: string;
	context?: Record<string, unknown>;
	recoveryHint?: string;
	validPredecessors?: readonly string[];
	validNext?: readonly string[];
};

export class GenericDomainError extends BaseDomainError<Record<string, unknown>> {
	readonly errorLabel: string;
	readonly code: string;
	readonly status: number;
	readonly context: Record<string, unknown>;
	readonly message: string;
	readonly recoveryHint?: string;
	readonly validPredecessors?: readonly string[];
	readonly validNext?: readonly string[];

	constructor(
		code: string,
		message: string,
		context?: Record<string, unknown>,
		recoveryHint?: string,
	) {
		super();
		this.errorLabel = code;
		this.code = code;
		this.status = STATUS_MAP[code] ?? DEFAULT_STATUS;
		this.message = message;
		this.context = context ?? {};
		this.recoveryHint = recoveryHint;
	}
}
