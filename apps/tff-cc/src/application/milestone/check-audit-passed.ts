import type { MilestoneAuditStore } from "../../domain/ports/milestone-audit-store.port.js";
import { Err, Ok, type Result } from "@tff/core";
import {
	GenericDomainError,
	type DomainError,
} from "../../infrastructure/errors/generic-domain-error.js";

export const checkAuditPassed = (
	milestoneId: string,
	store: MilestoneAuditStore,
): Result<void, DomainError> => {
	const r = store.getAudit(milestoneId);
	if (!r.ok) return r;
	if (!r.data) {
		return Err(
			new GenericDomainError(
				"AUDIT_REQUIRED",
				"Milestone has not been audited. Run /tff:audit-milestone first.",
			),
		);
	}
	if (r.data.verdict !== "ready") {
		return Err(
			new GenericDomainError(
				"AUDIT_NOT_READY",
				`Last audit verdict is '${r.data.verdict}'. Re-run /tff:audit-milestone to produce a 'ready' verdict.`,
			),
		);
	}
	return Ok(undefined);
};
