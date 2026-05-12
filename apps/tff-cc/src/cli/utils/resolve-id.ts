import {
	Err,
	Ok,
	type MilestoneStore,
	type Result,
	type SliceStore,
	type BaseDomainError,
} from "@tff/core";
import { GenericDomainError } from "../../infrastructure/errors/generic-domain-error.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MILESTONE_LABEL_RE = /^M(\d+)$/;
const SLICE_LABEL_RE = /^M(\d+)-S(\d+)$/;
const ADHOC_SLICE_LABEL_RE = /^([QD])-(\d+)$/;

export function resolveMilestoneId(
	label: string,
	milestoneStore: MilestoneStore,
): Result<string, BaseDomainError<unknown>> {
	if (UUID_RE.test(label)) return Ok(label);

	const m = MILESTONE_LABEL_RE.exec(label);
	if (!m) {
		return Err(
			new GenericDomainError("VALIDATION_ERROR", `Cannot resolve milestone label: '${label}'`),
		);
	}

	const number = parseInt(m[1], 10);
	const result = milestoneStore.getMilestoneByNumber(number);
	if (!result.ok) return result;
	if (!result.data) {
		return Err(new GenericDomainError("NOT_FOUND", `Milestone not found: '${label}'`));
	}
	return Ok(result.data.id);
}

export function resolveSliceId(
	label: string,
	sliceStore: SliceStore,
): Result<string, BaseDomainError<unknown>> {
	if (UUID_RE.test(label)) return Ok(label);

	const adhoc = ADHOC_SLICE_LABEL_RE.exec(label);
	if (adhoc) {
		const kind = adhoc[1] === "Q" ? "quick" : "debug";
		const number = parseInt(adhoc[2], 10);
		const list = sliceStore.listSlicesByKind(kind);
		if (!list.ok) return list;
		const found = list.data.find((s) => s.number === number);
		if (!found) {
			return Err(new GenericDomainError("NOT_FOUND", `Slice not found: '${label}'`));
		}
		return Ok(found.id);
	}

	const m = SLICE_LABEL_RE.exec(label);
	if (!m) {
		return Err(
			new GenericDomainError("VALIDATION_ERROR", `Cannot resolve slice label: '${label}'`),
		);
	}

	const milestoneNumber = parseInt(m[1], 10);
	const sliceNumber = parseInt(m[2], 10);
	const result = sliceStore.getSliceByNumbers(milestoneNumber, sliceNumber);
	if (!result.ok) return result;
	if (!result.data) {
		return Err(new GenericDomainError("NOT_FOUND", `Slice not found: '${label}'`));
	}
	return Ok(result.data.id);
}
