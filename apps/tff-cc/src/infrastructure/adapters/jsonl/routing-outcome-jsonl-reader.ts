import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { createInterface } from "node:readline";
import type {
	OutcomeReadFilter,
	OutcomeSource,
} from "../../../domain/ports/outcome-source.port.js";
import { RoutingOutcome } from "@tff/core";

export class JsonlRoutingOutcomeReader implements OutcomeSource {
	constructor(private readonly path: string) {}

	async *readOutcomes(filter: OutcomeReadFilter): AsyncIterable<RoutingOutcome> {
		try {
			await access(this.path);
		} catch {
			return;
		}

		const rl = createInterface({
			input: createReadStream(this.path, { encoding: "utf8" }),
			crlfDelay: Number.POSITIVE_INFINITY,
		});

		for await (const line of rl) {
			if (!line.trim()) continue;
			let parsed: unknown;
			try {
				parsed = JSON.parse(line);
			} catch (err) {
				process.stderr.write(
					`routing: skipped corrupt line in ${this.path}: ${err instanceof Error ? err.message : String(err)}\n`,
				);
				continue;
			}
			let outcome: RoutingOutcome;
			try {
				outcome = RoutingOutcome.create(parsed as Parameters<typeof RoutingOutcome.create>[0]);
			} catch (err) {
				process.stderr.write(
					`routing: skipped corrupt line in ${this.path}: ${err instanceof Error ? err.message : "validation failed"}\n`,
				);
				continue;
			}
			if (filter.source && outcome.source !== filter.source) continue;
			if (filter.decision_id && outcome.decisionId !== filter.decision_id) continue;
			if (filter.since && outcome.emittedAt < filter.since) continue;
			yield outcome;
		}
	}
}
