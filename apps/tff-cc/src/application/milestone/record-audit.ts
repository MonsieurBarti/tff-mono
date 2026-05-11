import type { DomainError, Result } from "@tff/core";
import type {
	AuditVerdict,
	MilestoneAuditStore,
} from "../../domain/ports/milestone-audit-store.port.js";

export interface RecordAuditInput {
	milestoneId: string;
	verdict: AuditVerdict;
	notes?: string;
}

export interface RecordAuditDeps {
	milestoneAuditStore: MilestoneAuditStore;
	now?: () => Date;
}

export const recordAuditUseCase = async (
	input: RecordAuditInput,
	deps: RecordAuditDeps,
): Promise<Result<void, DomainError>> => {
	const now = (deps.now ?? (() => new Date()))();
	return deps.milestoneAuditStore.upsertAudit({
		milestoneId: input.milestoneId,
		verdict: input.verdict,
		auditedAt: now.toISOString(),
		notes: input.notes,
	});
};
