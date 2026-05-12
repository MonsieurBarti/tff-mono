import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { createInterface } from "node:readline";
import type {
	OutcomeReadFilter,
	OutcomeSource,
} from "../../../domain/ports/outcome-source.port.js";
import { RoutingOutcome, type RoutingOutcomeProps } from "@tff/core";

const pick = (p: Record<string, unknown>, ...keys: string[]): unknown => {
	for (const key of keys) {
		if (key in p) return p[key];
	}
	return undefined;
};

const isRoutingOutcomeShape = (v: unknown): v is RoutingOutcomeProps => {
	if (typeof v !== "object" || v === null) return false;
	const p = v as Record<string, unknown>;
	const required = [
		["outcomeId", "outcome_id"],
		["decisionId", "decision_id"],
		["sliceId", "slice_id"],
		["workflowId", "workflow_id"],
		["emittedAt", "emitted_at"],
	];
	for (const keys of required) {
		const val = pick(p, ...keys);
		if (typeof val !== "string" || val === "") return false;
	}
	const dims = new Set(["agent", "tier", "unknown"]);
	const verdicts = new Set(["ok", "wrong", "too-low", "too-high"]);
	const sources = new Set(["debug-join", "manual", "model-judge"]);
	if (!dims.has(pick(p, "dimension") as string)) return false;
	if (!verdicts.has(pick(p, "verdict") as string)) return false;
	if (!sources.has(pick(p, "source") as string)) return false;
	return true;
};

function normalizeOutcomeProps(raw: Record<string, unknown>): RoutingOutcomeProps {
	return {
		outcomeId: pick(raw, "outcomeId", "outcome_id") as string,
		decisionId: pick(raw, "decisionId", "decision_id") as string,
		dimension: pick(raw, "dimension") as RoutingOutcomeProps["dimension"],
		verdict: pick(raw, "verdict") as RoutingOutcomeProps["verdict"],
		source: pick(raw, "source") as RoutingOutcomeProps["source"],
		sliceId: pick(raw, "sliceId", "slice_id") as string,
		workflowId: pick(raw, "workflowId", "workflow_id") as string,
		reason: pick(raw, "reason") as string | undefined,
		emittedAt: pick(raw, "emittedAt", "emitted_at") as string,
	};
}

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
				const raw = parsed as Record<string, unknown>;
				const props = "_props" in raw ? (raw._props as Record<string, unknown>) : raw;
				if (!isRoutingOutcomeShape(props)) throw new Error("invalid outcome shape");
				outcome = RoutingOutcome.create(normalizeOutcomeProps(props));
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
