import type { Result } from "@tff/core";
import type { DomainError } from "../../infrastructure/errors/generic-domain-error.js";

/**
 * Database initialization port. Narrow by design: only `init()`.
 * Transaction semantics live on a separate `TransactionRunner` port so that
 * consumers who only need a unit-of-work do not also get the initialization
 * surface (interface segregation).
 */
export interface DatabaseInit {
	init(): Result<void, DomainError>;
}
