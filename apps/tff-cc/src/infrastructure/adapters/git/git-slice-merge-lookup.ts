import type { DomainError } from "../../errors/generic-domain-error.js";
import { GenericDomainError } from "../../errors/generic-domain-error.js";
import type { SliceMergeLookup } from "../../../domain/ports/slice-merge-lookup.port.js";
import { Err, Ok, type Result } from "@tff/core";
import type { GitRunner } from "./git-runner.js";

const SLICE_LABEL_RE = /^M\d+-S\d+$/;
const NUL = "\x00";

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildLabelMatcher = (label: string): RegExp =>
	// Label stands alone: preceded by start-of-string or non-alnum, followed by non-digit (to
	// distinguish M01-S02 from M01-S020) and then non-alnum or end-of-string.
	new RegExp(`(?:^|[^0-9A-Za-z])${escapeRegex(label)}(?![0-9])(?:[^0-9A-Za-z]|$)`);

export interface GitSliceMergeLookupOpts {
	run: GitRunner;
	cwd: string;
}

export class GitSliceMergeLookup implements SliceMergeLookup {
	constructor(private readonly opts: GitSliceMergeLookupOpts) {}

	async findMergeCommit(
		sliceLabel: string,
		branches: string[],
	): Promise<Result<string, DomainError>> {
		if (!SLICE_LABEL_RE.test(sliceLabel)) {
			return Err(
				new GenericDomainError(
					"PRECONDITION_VIOLATION",
					`Invalid slice label format: "${sliceLabel}"`,
					{ code: "slice_label.format", expected: "M<d+>-S<d+>", actual: sliceLabel },
				),
			);
		}
		if (branches.length === 0) {
			return Err(
				new GenericDomainError("PRECONDITION_VIOLATION", "At least one branch is required", {
					code: "branches",
					expected: "at least one branch",
					actual: "empty",
				}),
			);
		}

		const matcher = buildLabelMatcher(sliceLabel);
		for (const branch of branches) {
			let stdout: string;
			try {
				stdout = await this.opts.run(
					"git",
					["log", "--grep", sliceLabel, "--format=%H%x00%s", "--reverse", branch],
					{ cwd: this.opts.cwd },
				);
			} catch {
				// Branch may not exist locally (e.g. milestone branch deleted after merge).
				// Fall through to the next candidate.
				continue;
			}

			for (const line of stdout.split("\n")) {
				if (!line.trim()) continue;
				const nul = line.indexOf(NUL);
				if (nul < 0) continue;
				const sha = line.slice(0, nul).trim();
				const subject = line.slice(nul + 1);
				if (matcher.test(subject)) return Ok(sha);
			}
		}

		return Err(
			new GenericDomainError(
				"PRECONDITION_VIOLATION",
				`No merge commit found for slice "${sliceLabel}" on branches [${branches.join(", ")}]`,
				{
					code: "slice.merge_commit",
					expected: `commit whose subject contains ${sliceLabel} as a standalone token`,
					actual: "no match",
				},
			),
		);
	}
}
