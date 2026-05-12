import type { OutcomeSource } from "../../domain/ports/outcome-source.port.js";
import type { OutcomeWriter } from "../../domain/ports/outcome-writer.port.js";

export interface ComputeImplicitOutcomesDeps {
	implicitSource: OutcomeSource;
	existingOutcomesSource: OutcomeSource;
	writer: OutcomeWriter;
}

export interface ComputeImplicitOutcomesResult {
	written: number;
	skipped: number;
}

export const computeImplicitOutcomesUseCase = async (
	deps: ComputeImplicitOutcomesDeps,
): Promise<ComputeImplicitOutcomesResult> => {
	const existingKeys = new Set<string>();
	for await (const o of deps.existingOutcomesSource.readOutcomes({ source: "debug-join" })) {
		existingKeys.add(o.decisionId);
	}

	let written = 0;
	let skipped = 0;
	for await (const o of deps.implicitSource.readOutcomes({})) {
		if (existingKeys.has(o.decisionId)) {
			skipped += 1;
			continue;
		}
		await deps.writer.append(o);
		existingKeys.add(o.decisionId);
		written += 1;
	}
	return { written, skipped };
};
